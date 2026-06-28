// Policy-driven E2E trajectory (TODO items 7 + 8).
//
// Simulates a multi-day patient↔app interaction. A natural-language POLICY conditions a
// Claude-agent "patient" (scripts/harness/_simulator.mjs, via @anthropic-ai/claude-agent-sdk)
// that responds to each day's generated plan —
// deciding how much of each task to complete and what pain to report. The harness logs each
// interaction task-wise, persists a running markdown memory per session, then verifies that
// whatever flags the policy produced (pain_stagnation / low_compliance) are matched by a
// corresponding notification from the cron. There is NO prior about which flags trip — the
// test asserts FLAG ⟺ NOTIFICATION consistency, whatever the policy yields.
//
//   npm run dev:logged
//   npm run harness:trajectory -- policy="only do about 30% of each task; pain stays around 6"
//   (also: days=14  complianceThreshold=50  name=reluctant  model=deepseek/deepseek-chat)
//
// Exit 0 = all assertions green, 1 = a failure.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, sleep } from "./_http.mjs";
import { scanLog, logSize } from "./_shared.mjs";
import { decidePatientActions, SIM_MODEL } from "./_simulator.mjs";
import { extractTasks, buildUpdates, formatTaskLog } from "./_plan.mjs";
import {
    createSession,
    appendDay,
    appendBlock,
    readDigest,
} from "./_policy-memory.mjs";

// ── args ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
    const out = {};
    for (const tok of argv) {
        const m = tok.match(/^(\w+)=([\s\S]*)$/);
        if (m) out[m[1]] = m[2];
    }
    return out;
}
const args = parseArgs(process.argv.slice(2));

const DEFAULT_POLICY =
    "You are a reluctant patient. Complete only about 30% of each prescribed task most days " +
    "(occasionally a bit more or less). Your pain hovers around 6/10 and does not really improve.";

const POLICY = args.policy ?? process.env.POLICY ?? DEFAULT_POLICY;
const DAYS = Number(args.days ?? 14);
const COMPLIANCE_THRESHOLD = Number(args.complianceThreshold ?? 50);
const NAME = args.name ?? "trajectory";
if (args.model) process.env.SIM_MODEL = args.model;

const CRON_SECRET = process.env.CRON_SECRET ?? "";

const c = createClient();
const results = [];
function record(name, ok, detail) {
    results.push({ name, ok });
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function stateOp(payload) {
    const before = logSize();
    const { res, body } = await c.postJson("/api/dev/state", payload);
    await sleep(300);
    return { res, body, findings: scanLog(before).findings };
}

const dateStr = (offset) =>
    new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

function recoveryDayOf(dateISO, surgeryDate) {
    if (!surgeryDate) return null;
    const ms = new Date(dateISO).getTime() - new Date(surgeryDate).getTime();
    return Math.max(1, Math.floor(ms / 86400000) + 1);
}

async function main() {
    if (!(await c.up())) {
        console.error(
            `✖ dev server not reachable at ${c.base}. Run \`npm run dev:logged\`.`,
        );
        process.exit(1);
    }
    // The patient simulator is a Claude Agent SDK agent (authenticates off the ambient
    // Claude login) — no OpenRouter key needed here.
    if (logSize() === 0)
        console.log(
            "⚠️  no .dev/server.log — log scanning OFF (run `npm run dev:logged`).\n",
        );

    console.log(`\n━━ Policy trajectory: "${NAME}" ━━`);
    console.log(
        `   days=${DAYS}  complianceThreshold=${COMPLIANCE_THRESHOLD}%  sim=${SIM_MODEL}`,
    );
    console.log(`   policy: ${POLICY}\n`);

    // 1. Seed + login the standard harness patient (fully onboarded, no LLM onboarding).
    const { res: seedRes, body: seed } = await c.postJson(
        "/api/dev/seed-patient",
        {},
    );
    record("seed harness patient", seedRes.ok && !!seed?.email, seed?.error);
    if (!seedRes.ok) process.exit(1);
    record("login", await c.login(seed.email, seed.password));
    const sess = await c.session();
    record("session valid", !!sess?.user?.id, sess?.user?.email);
    if (!sess?.user?.id) process.exit(1);
    const userId = sess.user.id;

    // 2. Patient conditioning: onboarding profile + surgery date.
    const { body: prof } = await c.postJson("/api/dev/state", {
        op: "profile",
    });
    const profileText = [prof?.profile, prof?.semantic]
        .filter(Boolean)
        .join("\n\n");
    const surgeryDate = prof?.surgeryDate ?? null;
    record("loaded patient profile", !!prof, prof?.treatment ?? "");

    // Clean slate so force-regen can't collide on the causal-state chain from prior runs,
    // and so the metric/flag assertions reflect ONLY this run.
    const { body: reset } = await c.postJson("/api/dev/state", { op: "reset" });
    record(
        "reset patient state",
        reset?.ok === true,
        `cleared ${reset?.deletedStates ?? "?"} states`,
    );

    const session = createSession({
        name: NAME,
        policy: POLICY,
        days: DAYS,
        complianceThreshold: COMPLIANCE_THRESHOLD,
        simModel: SIM_MODEL,
    });
    console.log(`   session memory → ${session}\n`);

    // 3. Drive DAYS simulated days.
    const stateIds = [];
    let simFailures = 0;
    for (let i = 0; i < DAYS; i++) {
        const day = i + 1;
        const date = dateStr(i);
        const recoveryDay = recoveryDayOf(date, surgeryDate);

        const {
            res,
            body: state,
            findings,
        } = await stateOp({
            op: "fetch",
            date,
            force: true,
        });
        const modules = state?.modules ?? [];
        if (!res.ok || state?.error || modules.length < 3) {
            record(
                `day ${day}: state generated`,
                false,
                state?.error ?? `${modules.length} modules`,
            );
            simFailures++;
            if (simFailures >= 3) {
                record("aborting — 3 day failures", false);
                return finish(session);
            }
            continue;
        }
        stateIds.push(state.id);

        // Patient (LLM) decides actions for today's tasks.
        const { tasks, index } = extractTasks(state);
        let decision;
        try {
            decision = await decidePatientActions({
                policy: POLICY,
                profile: profileText,
                memoryDigest: readDigest(session),
                day,
                recoveryDay,
                tasks,
            });
        } catch (e) {
            record(`day ${day}: simulator`, false, e.message);
            simFailures++;
            if (simFailures >= 3) return finish(session);
            continue;
        }

        // Apply the decision via per-module log ops.
        const updates = buildUpdates(
            state,
            decision.actions,
            { tasks, index },
            decision.pain,
        );
        let logErr = null;
        for (const u of updates) {
            const { body: lb, findings: lf } = await stateOp({
                op: "log",
                moduleId: u.moduleId,
                updates: u.updates,
            });
            if (lb?.error) logErr = lb.error;
            if (lf.length) logErr = `${lf.length} log error(s)`;
        }

        const taskLog = formatTaskLog(tasks, decision.actions);
        const line = `Day ${day} (rec ${recoveryDay ?? "?"}) · ${taskLog} · pain ${decision.pain}/10 · "${decision.note}"`;
        appendDay(session, line);
        console.log(`   ${line}`);
        record(
            `day ${day}: logged ${tasks.length} task(s)`,
            !logErr && !findings.length,
            logErr ?? undefined,
        );

        if (i < DAYS - 1) await sleep(800);
    }

    // 4. Post-run: history + persisted metrics (verifies 7.5 end-to-end).
    console.log("\n── assertions ──");
    const { body: history } = await c.postJson("/api/dev/state", {
        op: "history",
    });
    const traj = (Array.isArray(history) ? history : []).filter((s) =>
        stateIds.includes(s.id),
    );
    record(
        `history has ${stateIds.length} trajectory states`,
        traj.length === stateIds.length,
        `found ${traj.length}`,
    );

    const { body: metrics } = await c.postJson("/api/dev/state", {
        op: "metrics",
    });
    const metricRows = Array.isArray(metrics) ? metrics : [];
    const withCompliance = metricRows.filter(
        (m) => m.compliancePct !== null,
    ).length;
    const withPain = metricRows.filter((m) => m.painScore !== null).length;
    record(
        "DailyMetric rows persisted (compliance + pain)",
        metricRows.length >= stateIds.length &&
            withCompliance > 0 &&
            withPain > 0,
        `${metricRows.length} rows, ${withCompliance} w/ compliance, ${withPain} w/ pain`,
    );

    // 5. Flags produced by THIS policy (no prior on which fire).
    const { body: flagData } = await c.postJson("/api/dev/state", {
        op: "flags",
        complianceThreshold: COMPLIANCE_THRESHOLD,
    });
    const firedKinds = new Set((flagData?.flags ?? []).map((f) => f.kind));
    const painFired = firedKinds.has("pain_stagnation");
    const compFired = firedKinds.has("low_compliance");
    const meanCompliance =
        metricRows.length > 0
            ? Math.round(
                  metricRows
                      .filter((m) => m.compliancePct !== null)
                      .reduce((s, m) => s + m.compliancePct, 0) /
                      Math.max(1, withCompliance),
              )
            : null;
    console.log(
        `   flags fired: [${[...firedKinds].join(", ") || "none"}]` +
            ` · mean compliance ${meanCompliance}% · last pain ${flagData?.painSeries?.slice(-1)[0]?.pain ?? "?"}`,
    );

    // 6. Trigger the cron scoped to this patient and verify FLAG ⟺ NOTIFICATION consistency.
    if (!CRON_SECRET) {
        record(
            "cron notifications",
            false,
            "CRON_SECRET missing from .env.local",
        );
        return finish(session);
    }
    const cronCall = await fetch(`${c.base}/api/notifications/cron`, {
        method: "POST",
        headers: {
            authorization: `Bearer ${CRON_SECRET}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            complianceThreshold: COMPLIANCE_THRESHOLD,
            userId,
        }),
    });
    const cronBody = await cronCall.json().catch(() => ({}));
    const mine = (cronBody?.results ?? []).find((r) => r.userId === userId);
    record(
        "cron ran for patient",
        cronCall.ok && !!mine,
        mine ? `sent [${mine.sent.join(", ")}]` : `status ${cronCall.status}`,
    );

    if (mine) {
        const attempted = (label) =>
            [...mine.sent, ...mine.errors].some((s) => s.includes(label));

        // pain_stagnation flag ⟺ "pain-stagnation" notification
        record(
            `pain flag ⟺ notification (flag=${painFired})`,
            painFired === attempted("pain-stagnation"),
            painFired ? "expected pain alert" : "expected no pain alert",
        );
        // low_compliance flag ⟺ "low-compliance" notification
        record(
            `compliance flag ⟺ notification (flag=${compFired})`,
            compFired === attempted("low-compliance"),
            compFired
                ? "expected compliance alert"
                : "expected no compliance alert",
        );

        appendBlock(
            session,
            [
                "## Result",
                "",
                `- Flags fired: ${[...firedKinds].join(", ") || "none"}`,
                `- Mean compliance: ${meanCompliance}%`,
                `- Cron sent: ${mine.sent.join(", ") || "none"}`,
                `- Cron errors: ${mine.errors.join(", ") || "none"}`,
            ].join("\n"),
        );
    }

    finish(session);
}

function finish(session) {
    const failed = results.filter((r) => !r.ok).length;
    console.log(
        `\n── policy trajectory: ${results.length - failed}/${results.length} green ──`,
    );
    if (session) console.log(`   full session log: ${session}`);
    process.exit(failed ? 1 : 0);
}

main().catch((e) => {
    console.error("trajectory e2e crashed:", e);
    process.exit(1);
});
