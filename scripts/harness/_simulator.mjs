// Patient-simulator "subagent" for the policy-driven harness.
//
// This is the OpenRouter LLM call that PLAYS THE PATIENT. Given a natural-language
// `policy`, the patient's onboarding profile, a running memory digest, and the tasks the
// app prescribed for the day, it decides — in character, per the policy — how much of each
// task to actually complete and what pain to report. Returns structured JSON the harness
// applies via the log op.
//
// Kept as a direct fetch (no AI-SDK / no Prisma) so it runs from a plain node .mjs and keeps
// the simulation reasoning OUT of the main agent's context. Caller must have loaded
// .env.local (for OPENROUTER_API_KEY) before importing/using this.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Cheap model by default — the patient side doesn't need a frontier model. Override per run.
export const SIM_MODEL =
    process.env.SIM_MODEL ?? "deepseek/deepseek-chat";

function extractJson(text) {
    // Models sometimes wrap JSON in prose or ```json fences. Grab the outermost object.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : text;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end < 0) throw new Error(`no JSON object in: ${text.slice(0, 200)}`);
    return JSON.parse(candidate.slice(start, end + 1));
}

async function callOpenRouter(messages, { model = SIM_MODEL, temperature = 0.7 } = {}) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_API_KEY not set (load .env.local first)");

    const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model,
            temperature,
            messages,
            // Nudge structured output where supported; we still defensively parse.
            response_format: { type: "json_object" },
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return content;
}

const SYSTEM = `You are simulating a real post-operative recovery patient interacting with a recovery app.
You are NOT an assistant — you are the patient. Each day the app gives you a plan (a list of tasks
with targets) and asks you to log how much you actually did, plus your pain level (0-10).

You must behave according to the POLICY you are given. The policy describes your tendencies
(e.g. how diligently you follow the plan, how your pain behaves). Stay in character and be
internally consistent with your prior days (given as memory).

Respond with ONLY a JSON object of this exact shape:
{
  "pain": <integer 0-10>,
  "note": "<one short sentence, in the patient's voice>",
  "actions": [ { "n": <task number>, "value": <number you actually did, 0..goal or beyond> } ]
}
Include one action per task number you were given. Do not add commentary outside the JSON.`;

/**
 * Ask the simulated patient to respond to today's plan.
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

    const user = `POLICY (how you, the patient, behave):
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

    const content = await callOpenRouter([
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
    ]);

    let parsed;
    try {
        parsed = extractJson(content);
    } catch (e) {
        throw new Error(`simulator returned unparseable output: ${e.message}`);
    }

    const pain = Math.max(0, Math.min(10, Math.round(Number(parsed.pain ?? 0))));
    const actions = Array.isArray(parsed.actions)
        ? parsed.actions
              .map((a) => ({ n: Number(a.n), value: Number(a.value) }))
              .filter((a) => Number.isFinite(a.n) && Number.isFinite(a.value))
        : [];
    return { pain, note: String(parsed.note ?? ""), actions };
}
