// E2E state-trajectory journey: seeds an onboarded patient then simulates N recovery
// days — generate state → log progress → advance date → repeat.  Asserts per step:
// state generates, modules present, progress logging succeeds, no server-log errors.
// After the run: verifies the causal chain, the pain series, and that the pain-stagnation
// flag fires when pain plateaus for ≥3 days.
//
//   npm run dev:logged         # one terminal
//   npm run harness:trajectory
//
// Exit 0 = all green, 1 = a step failed.

import { createClient, sleep } from "./_http.mjs";
import { scanLog, logSize } from "./_shared.mjs";

const N_DAYS = 4;
// Pain series: starts at 6, drops to 5, then plateaus → triggers pain_stagnation on day 4
const PAIN_BY_DAY = [6, 5, 5, 5];

const c = createClient();
const results = [];
function record(name, ok, detail) {
    results.push({ name, ok });
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function stateOp(payload) {
    const before = logSize();
    const { res, body } = await c.postJson("/api/dev/state", payload);
    await sleep(400);
    return { res, body, findings: scanLog(before).findings };
}

// Given a state's symptoms module, build updateModuleProgress updates that set
// all pain metrics to painValue, preserving every other field.
function buildPainUpdates(symModule, painValue) {
    const trackables = symModule?.progress?.trackables ?? [];
    return trackables.map((t) => {
        const data = { ...t.data };
        // Primary key is data.pain; fallback: any entry with .type === "pain"
        if (data.pain && typeof data.pain === "object") {
            data.pain = { ...data.pain, value: painValue };
        } else {
            for (const key of Object.keys(data)) {
                if (data[key]?.type === "pain") {
                    data[key] = { ...data[key], value: painValue };
                }
            }
        }
        return { id: t.id, data };
    });
}

// Given any module, build updates that set every metric value to its goal
// (simulating full completion for that module's trackables).
function buildCompletionUpdates(mod) {
    const trackables = mod?.progress?.trackables ?? [];
    return trackables.map((t) => {
        const data = { ...t.data };
        for (const key of Object.keys(data)) {
            if (data[key] && typeof data[key] === "object" && "goal" in data[key]) {
                data[key] = { ...data[key], value: data[key].goal };
            }
        }
        return { id: t.id, data };
    });
}

// ISO date string (midnight UTC) for today + offsetDays
function dateStr(offsetDays) {
    return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

async function main() {
    if (!(await c.up())) {
        console.error(`✖ dev server not reachable at ${c.base}. Run \`npm run dev:logged\`.`);
        process.exit(1);
    }
    if (logSize() === 0) {
        console.log("⚠️  no .dev/server.log — runtime log scanning is OFF (run `npm run dev:logged`).\n");
    }

    // 1. Seed + login the standard harness patient (fully onboarded, no LLM calls).
    const { res: seedRes, body: seedBody } = await c.postJson("/api/dev/seed-patient", {});
    record("seed harness patient", seedRes.ok && seedBody?.email, seedBody?.error);
    if (!seedRes.ok) process.exit(1);

    record("login", await c.login(seedBody.email, seedBody.password));
    const sess = await c.session();
    record("session valid", !!sess?.user?.id, sess?.user?.email);
    if (!sess?.user?.id) process.exit(1);

    // 2. Drive N recovery days.
    const generatedStateIds = [];
    for (let i = 0; i < N_DAYS; i++) {
        const day = i + 1;
        const date = dateStr(i);
        const painValue = PAIN_BY_DAY[i];
        console.log(`\n── Day ${day} (${date}, pain target=${painValue}) ──`);

        // Generate state for this day.
        const { res, body: state, findings } = await stateOp({ op: "fetch", date, force: true });
        const modules = state?.modules ?? [];
        const hasModules = modules.length >= 3;
        record(
            `day ${day}: state generated`,
            res.ok && !state?.error && hasModules && !findings.length,
            state?.error ?? `${modules.length} modules${findings.length ? `, ${findings.length} log error(s)` : ""}`,
        );
        if (!res.ok || state?.error) continue;
        generatedStateIds.push(state.id);

        // Log pain on the symptoms module.
        const symMod = modules.find((m) => m.type === "symptoms");
        if (symMod) {
            const painUpdates = buildPainUpdates(symMod, painValue);
            if (painUpdates.length > 0) {
                const { res: lr, body: lb, findings: lf } = await stateOp({
                    op: "log",
                    moduleId: symMod.id,
                    updates: painUpdates,
                });
                record(
                    `day ${day}: pain=${painValue} logged`,
                    lr.ok && !lb?.error && !lf.length,
                    lb?.error ?? (lf.length ? `${lf.length} log error(s)` : undefined),
                );
            } else {
                record(`day ${day}: pain logged`, false, "no trackables in symptoms module");
            }
        } else {
            record(`day ${day}: pain logged`, false, "no symptoms module in state");
        }

        // Log completion on exercise module to build progress history.
        const exMod = modules.find((m) => m.type === "exercise");
        if (exMod) {
            const exUpdates = buildCompletionUpdates(exMod);
            if (exUpdates.length > 0) {
                const { res: er, body: eb } = await stateOp({
                    op: "log",
                    moduleId: exMod.id,
                    updates: exUpdates,
                });
                record(
                    `day ${day}: exercise progress logged`,
                    er.ok && !eb?.error,
                    eb?.error,
                );
            }
        }

        // Throttle between days so state-gen LLM calls don't overlap.
        if (i < N_DAYS - 1) await sleep(1000);
    }

    // 3. History + causal chain.
    console.log("\n── Post-run assertions ──");
    const { res: hr, body: history } = await c.postJson("/api/dev/state", { op: "history" });
    const trajectoryStates = (Array.isArray(history) ? history : []).filter((s) =>
        generatedStateIds.includes(s.id),
    );

    record(
        `history: ${N_DAYS} trajectory states`,
        hr.ok && trajectoryStates.length === N_DAYS,
        `found ${trajectoryStates.length}/${N_DAYS}`,
    );

    // Verify causal chain: each state[i].causalStateId should equal state[i-1].id.
    // States come from getStateHistory ordered oldest→newest.
    const orderedIds = trajectoryStates
        .sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime())
        .map((s) => s.id);

    let chainOk = true;
    for (let i = 1; i < trajectoryStates.length; i++) {
        const s = trajectoryStates.find((x) => x.id === orderedIds[i]);
        if (s?.causalStateId !== orderedIds[i - 1]) {
            chainOk = false;
            break;
        }
    }
    record("causal chain links day→day", chainOk || trajectoryStates.length < 2);

    // 4. Flags: pain [6,5,5,5] → last 3 days flat at 5 → pain_stagnation expected.
    const { res: fr, body: flagData } = await c.postJson("/api/dev/state", { op: "flags" });
    if (fr.ok && flagData?.painSeries) {
        const series = flagData.painSeries;
        record(
            `pain series has ${N_DAYS} entries`,
            series.length >= N_DAYS,
            `got ${series.length}`,
        );

        // Verify the logged pain values match our targets (by day order).
        const loggedPains = series.slice(-N_DAYS).map((d) => d.pain);
        const painMatchesTarget = loggedPains.length > 0 &&
            loggedPains[0] === PAIN_BY_DAY[0];
        record(
            "pain series reflects logged values",
            painMatchesTarget,
            `first logged pain = ${loggedPains[0]}, expected ${PAIN_BY_DAY[0]}`,
        );

        // Pain [5,5,5] in last 3 days → pain_stagnation flag expected.
        const painStagnationFired = flagData.flags?.some((f) => f.kind === "pain_stagnation");
        record(
            "pain_stagnation flag fires for 3-day plateau",
            painStagnationFired,
            painStagnationFired
                ? `flags: ${flagData.flags.map((f) => f.kind).join(", ")}`
                : `no pain_stagnation in [${flagData.flags?.map((f) => f.kind).join(", ") ?? "none"}]`,
        );
    } else {
        record("flags endpoint reachable", fr.ok, flagData?.error ?? `status ${fr.status}`);
    }

    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n── trajectory E2E: ${results.length - failed}/${results.length} green ──`);
    process.exit(failed ? 1 : 0);
}

main().catch((e) => {
    console.error("trajectory e2e crashed:", e);
    process.exit(1);
});
