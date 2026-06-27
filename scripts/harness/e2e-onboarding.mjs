// E2E onboarding journey: a freshly conjured user goes through the WHOLE real onboarding
// graph — biometrics → screening → the LLM-generated questions (answered dynamically by an
// answer-bot keyed on inputType) → profile generation → save → dashboard. Real LLM calls;
// this is an integration/regression test of the actual flow, not a stub.
//
//   npm run dev:logged      # one terminal
//   npm run harness:onboarding
//
// Exit 0 = all green, 1 = a step failed.

import { createClient, sleep } from "./_http.mjs";
import { scanLog, logSize } from "./_shared.mjs";

const c = createClient();
const results = [];
function record(name, ok, detail) {
    results.push({ name, ok });
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// Answer-bot: produce a plausible answer for any dynamically-generated question, purely
// from its declared shape. No LLM — deterministic, so the harness controls the loop.
function answerFor(q) {
    const m = q.metadata ?? {};
    switch (q.inputType) {
        case "choice":
            return q.options?.[0] ?? "Yes";
        case "slider":
            return String(Math.round(((m.sliderMin ?? 0) + (m.sliderMax ?? 10)) / 2));
        case "text":
            return "I live in a single-storey flat with my spouse, who helps with meals and getting around.";
        case "date":
            return new Date().toISOString().slice(0, 10);
        default:
            return "Okay";
    }
}

// One onboarding op + a scan of the log delta it produced.
async function op(payload) {
    const before = logSize();
    const { res, body } = await c.postJson("/api/dev/onboarding", payload);
    await sleep(300);
    return { res, body, findings: scanLog(before).findings };
}

async function main() {
    if (!(await c.up())) {
        console.error(`✖ dev server not reachable at ${c.base}. Run \`npm run dev:logged\`.`);
        process.exit(1);
    }
    if (logSize() === 0) {
        console.log("⚠️  no .dev/server.log — runtime log scanning is OFF (run `npm run dev:logged`).\n");
    }

    const email = `e2e-${Date.now()}@test.local`;
    const password = "e2e-password";

    // 1. Fresh user + login.
    const { res: sres } = await c.signup(email, "E2E Patient", password);
    record("signup fresh user", sres.status < 400, email);
    record("login", await c.login(email, password));
    const sess = await c.session();
    record("session valid", sess?.user?.email === email, sess?.user?.email);
    record(
        "starts not-onboarded",
        sess?.user?.doneOnboarding === false,
        `doneOnboarding=${sess?.user?.doneOnboarding}`,
    );

    // 2. Biometrics.
    const bio = {
        age: 60,
        sex: "Male",
        treatment: "Colostomy reversal",
        surgeryDate: new Date(Date.now() - 7 * 864e5).toISOString(),
    };
    const b = await op({ op: "biometrics", bio });
    record("submit biometrics", b.res.ok && !b.findings.length, b.body?.error);

    // 3. Start → screening interrupt.
    let phase = (await op({ op: "start" })).body;
    record("start → screening", phase?.phase === "collect_screening_responses", phase?.phase);

    // 4. Drive the interrupt loop (screening, then the LLM question chain).
    let steps = 0;
    let answered = 0;
    while (phase && steps < 15) {
        steps++;
        if (["complete", "screening_blocked", "error"].includes(phase.phase)) break;

        let input;
        if (phase.phase === "collect_screening_responses") {
            // All "No" → not flagged → not blocked.
            input = Object.fromEntries(phase.questions.map((q) => [q.id, false]));
        } else if (phase.phase === "answer_question") {
            input = answerFor(phase.question);
            answered++;
            console.log(`   ↳ Q${phase.questionCount}: "${phase.question.questionText}" (${phase.question.inputType}) → "${input}"`);
        } else {
            record("graph", false, `unexpected phase ${phase.phase}`);
            break;
        }

        const r = await op({ op: "resume", input });
        if (r.findings.length) {
            record(`resume (${phase.phase})`, false, `${r.findings.length} log error(s)`);
            r.findings.slice(0, 5).forEach((f) => console.log("    ⤷ " + f));
        }
        phase = r.body;
    }

    record(
        `onboarding completes (${answered} question${answered === 1 ? "" : "s"} answered)`,
        phase?.phase === "complete",
        `final phase: ${phase?.phase}${phase?.message ? ` — ${phase.message}` : ""}`,
    );

    // 5. Completion reflected in session + dashboard.
    const sess2 = await c.session();
    record("doneOnboarding flips true", sess2?.user?.doneOnboarding === true);
    const dash = await c.hfetch("/patient/dashboard");
    record("dashboard renders", dash.status === 200, `status ${dash.status}`);

    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n── onboarding E2E: ${results.length - failed}/${results.length} green ──`);
    process.exit(failed ? 1 : 0);
}

main().catch((e) => {
    console.error("e2e crashed:", e);
    process.exit(1);
});
