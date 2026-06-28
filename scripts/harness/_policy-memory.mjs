// Running markdown memory for a policy simulation session.
//
// Each session gets one markdown file under .dev/policy-sessions/. Every simulated day
// appends a compact line so the patient-simulator has continuity across days WITHOUT being
// fed the full transcript (which would blow up context and cost). readDigest() returns just
// the trailing window for the next prompt. The file also doubles as a human-readable record
// of the whole run.

import fs from "fs";
import path from "path";

const DIR = ".dev/policy-sessions";

/** Start a new session file; returns its path. `name` is slugged into the filename. */
export function createSession({ name, policy, days, complianceThreshold, simModel }) {
    fs.mkdirSync(DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const slug = (name || "session").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const file = path.join(DIR, `${stamp}-${slug}.md`);
    const header = [
        `# Policy session — ${name}`,
        "",
        `- Started: ${new Date().toISOString()}`,
        `- Days: ${days}`,
        `- Compliance threshold: ${complianceThreshold}%`,
        `- Simulator model: ${simModel}`,
        "",
        "## Policy",
        "",
        policy,
        "",
        "## Day-by-day log",
        "",
    ].join("\n");
    fs.writeFileSync(file, header);
    return file;
}

/** Append one day's summary line (markdown bullet). */
export function appendDay(file, line) {
    fs.appendFileSync(file, `- ${line}\n`);
}

/** Append a free-form block (e.g. final assertions) to the session file. */
export function appendBlock(file, block) {
    fs.appendFileSync(file, `\n${block}\n`);
}

/**
 * Return a compact digest of the last `maxDays` day-lines for the simulator prompt — the
 * patient's own recent history, not the whole file.
 */
export function readDigest(file, maxDays = 5) {
    if (!fs.existsSync(file)) return "";
    const lines = fs
        .readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => l.startsWith("- Day "));
    return lines.slice(-maxDays).join("\n");
}
