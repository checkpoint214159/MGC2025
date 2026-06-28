// Patient-simulator "subagent" for the policy-driven harness.
//
// The patient is a REAL Claude agent, spawned via the Claude Agent SDK (@anthropic-ai/
// claude-agent-sdk) — not an OpenRouter completion. Given a natural-language `policy`, the
// patient's onboarding profile, and a running memory digest, the agent decides — in character,
// per the policy — how much of each prescribed task to actually complete and what pain to
// report. Returns structured JSON the harness applies via the log op.
//
// Runs from a plain `npm run` because the SDK spawns its own agent process; it authenticates
// off the ambient Claude login (no extra key needed in this environment). Each day is a fresh
// single-turn agent conditioned on the policy + the patient's own recent history (the memory
// digest), which keeps continuity without an ever-growing context.

import { query } from "@anthropic-ai/claude-agent-sdk";

// Patient model. A frontier model isn't needed to role-play a patient, so default to a cheap
// fast one; override per run with SIM_MODEL (alias like "sonnet"/"opus" or a full model id).
export const SIM_MODEL = process.env.SIM_MODEL ?? "haiku";

const PER_DAY_TIMEOUT_MS = Number(process.env.SIM_TIMEOUT_MS ?? 120_000);

function extractJson(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : text;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end < 0)
        throw new Error(`no JSON object in: ${text.slice(0, 200)}`);
    return JSON.parse(candidate.slice(start, end + 1));
}

const SYSTEM = `You are simulating a real post-operative recovery patient interacting with a recovery app.
You are NOT an assistant — you ARE the patient. Each day the app gives you a plan (a list of tasks
with targets) and asks you to log how much you actually did, plus your pain level (0-10).

You must behave according to the POLICY you are given. The policy describes your tendencies
(e.g. how diligently you follow the plan, how your pain behaves). Stay in character and be
internally consistent with your prior days (given as memory).

Respond with ONLY a JSON object of this exact shape, no prose around it:
{
  "pain": <integer 0-10>,
  "note": "<one short sentence, in the patient's voice>",
  "actions": [ { "n": <task number>, "value": <number you actually did, 0..target or beyond> } ]
}
Include exactly one action per task number you were given.`;

/** Run the patient agent for one day; returns the final assistant text. */
async function runPatientAgent(userPrompt, { model }) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), PER_DAY_TIMEOUT_MS);
    try {
        const response = query({
            prompt: userPrompt,
            options: {
                model,
                systemPrompt: SYSTEM,
                maxTurns: 1,
                allowedTools: [], // pure decision — the patient has no tools
                abortController: ac,
            },
        });
        let text = "";
        for await (const m of response) {
            if (m.type === "result" && m.subtype === "success") {
                text = m.result ?? "";
            } else if (m.type === "assistant" && !text) {
                // fallback: pull text from the assistant message if no result arrives
                const content = m.message?.content;
                if (Array.isArray(content)) {
                    text = content
                        .filter((c) => c.type === "text")
                        .map((c) => c.text)
                        .join("");
                }
            }
        }
        return text;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Ask the simulated patient (a Claude agent) to respond to today's plan.
 *
 * @param {object} p
 * @param {string} p.policy        natural-language conditioning for the patient
 * @param {string} p.profile       onboarding profile / semantic memory
 * @param {string} p.memoryDigest  compact running summary of prior days
 * @param {number} p.day           1-based simulation day
 * @param {number|null} p.recoveryDay  recovery day (since surgery), if known
 * @param {{n:number,label:string,goal:number,unit:string}[]} p.tasks  today's tasks
 * @returns {Promise<{ pain:number, note:string, actions:{n:number,value:number}[] }>}
 */
export async function decidePatientActions(p) {
    const taskLines = p.tasks
        .map((t) => `  #${t.n} ${t.label} — target ${t.goal} ${t.unit}`)
        .join("\n");

    const userPrompt = `POLICY (how you, the patient, behave):
${p.policy}

YOUR PROFILE (from onboarding):
${p.profile || "(none on file)"}

RECENT DAYS (your own history; keep continuity):
${p.memoryDigest || "(this is day 1 — no history yet)"}

TODAY is simulation day ${p.day}${p.recoveryDay ? ` (recovery day ${p.recoveryDay})` : ""}.
The app prescribed these tasks:
${taskLines || "  (no tasks today)"}

For each task #n decide the value you actually achieved (0 means skipped; meeting target means
value >= target). Then report your pain (0-10). Respond with the JSON object only.`;

    const text = await runPatientAgent(userPrompt, { model: SIM_MODEL });
    if (!text)
        throw new Error("patient agent returned no output (auth/timeout?)");

    let parsed;
    try {
        parsed = extractJson(text);
    } catch (e) {
        throw new Error(
            `patient agent returned unparseable output: ${e.message}`,
        );
    }

    const pain = Math.max(
        0,
        Math.min(10, Math.round(Number(parsed.pain ?? 0))),
    );
    const actions = Array.isArray(parsed.actions)
        ? parsed.actions
              .map((a) => ({ n: Number(a.n), value: Number(a.value) }))
              .filter((a) => Number.isFinite(a.n) && Number.isFinite(a.value))
        : [];
    return { pain, note: String(parsed.note ?? ""), actions };
}
