// Shared harness utilities: the failure watchlist + log scanning.
//
// The dev server is run via `npm run dev:logged`, which tees stdout/stderr to
// .dev/server.log. The harness reads that file to "see" runtime failures the way
// a human would by watching the terminal — but automatically.

import { readFileSync, statSync, existsSync } from "node:fs";

export const LOG_PATH = ".dev/server.log";

// Failure patterns, grown from real bugs this app has actually hit. This is the
// harness's memory of what "broken" looks like — ADD to it whenever a new failure
// mode shows up, so the loop catches it next time instead of a human re-pasting logs.
export const WATCHLIST = [
    /Transactions are not supported in HTTP mode/i, // Neon HTTP + implicit transaction (upsert w/ empty update, createMany, …)
    /unhandledRejection/i,
    /Cannot update a component/i, // setState during render (e.g. router.push in render)
    /\[prisma\][^\n]*❌/, // the per-op prisma diagnostic firing on an error
    /PrismaClient(Validation|KnownRequest|Unknown|Rust|Initialization)?Error/,
    /Hydration failed|did not match\. Server:|Text content does not match/i,
    /\[state-gen\][^\n]*(error|failed)/i,
    /\[llm\][^\n]*(✗|error|failed)/i,
    /\[cron\][^\n]*(failed|error)/i,
    /\[push\][^\n]*✗/i,
    /\b(TypeError|ReferenceError|RangeError)\b/,
    /Unhandled Runtime Error|Internal Server Error/i,
    /Error: connect ECONNREFUSED/i,
];

export function logSize() {
    try {
        return existsSync(LOG_PATH) ? statSync(LOG_PATH).size : 0;
    } catch {
        return 0;
    }
}

/**
 * Scan the dev log from `fromOffset` bytes to the end for any watchlist pattern.
 * Pass the byte offset captured *before* an action to isolate failures it caused.
 */
export function scanLog(fromOffset = 0) {
    if (!existsSync(LOG_PATH)) {
        return { available: false, findings: [] };
    }
    const buf = readFileSync(LOG_PATH);
    const text = buf.subarray(fromOffset).toString("utf8");
    const findings = [];
    for (const line of text.split("\n")) {
        if (WATCHLIST.some((re) => re.test(line))) {
            findings.push(line.trim());
        }
    }
    return { available: true, findings };
}

/** @param {number} ms */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
