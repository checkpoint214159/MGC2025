// Aggregate LLM usage stats from .dev/server.log.
// Parses every [llm-usage] line and prints a cost/token breakdown by model.
//
//   npm run usage              # full session summary
//   npm run usage -- --last N  # last N calls only
//
// Exit 0 always (this is a reporting tool, not a gate).

import { readFileSync, existsSync } from "node:fs";

const LOG_PATH = ".dev/server.log";
const args = process.argv.slice(2);
const lastN = (() => {
    const idx = args.indexOf("--last");
    return idx >= 0 ? Number(args[idx + 1]) || 0 : 0;
})();

if (!existsSync(LOG_PATH)) {
    console.log(`No log at ${LOG_PATH} — run \`npm run dev:logged\` first.`);
    process.exit(0);
}

const lines = readFileSync(LOG_PATH, "utf8").split("\n");
const entries = lines
    .filter((l) => l.includes("[llm-usage] "))
    .map((l) => {
        try {
            return JSON.parse(l.slice(l.indexOf("[llm-usage] ") + 12));
        } catch {
            return null;
        }
    })
    .filter(Boolean);

const subset = lastN > 0 ? entries.slice(-lastN) : entries;

if (subset.length === 0) {
    console.log("No [llm-usage] records in log yet.");
    process.exit(0);
}

// Aggregate by model
const byModel = {};
for (const e of subset) {
    const m = (byModel[e.model] ??= {
        calls: 0, in: 0, out: 0, cacheRead: 0, costUsd: 0, ms: 0,
    });
    m.calls++;
    m.in += e.in;
    m.out += e.out;
    m.cacheRead += e.cacheRead ?? 0;
    m.costUsd += e.costUsd ?? 0;
    m.ms += e.ms ?? 0;
}

const totalCost = subset.reduce((s, e) => s + (e.costUsd ?? 0), 0);
const totalMs = subset.reduce((s, e) => s + (e.ms ?? 0), 0);
const totalIn = subset.reduce((s, e) => s + e.in, 0);
const totalOut = subset.reduce((s, e) => s + e.out, 0);
const totalCacheRead = subset.reduce((s, e) => s + (e.cacheRead ?? 0), 0);
const avgCacheHit = totalIn > 0 ? Math.round((totalCacheRead / totalIn) * 100) : 0;

console.log(`\n── LLM Usage Report (${subset.length} call${subset.length === 1 ? "" : "s"}${lastN ? `, last ${lastN}` : ""}) ──`);
console.log(`Total cost    : $${totalCost.toFixed(5)}`);
console.log(`Total tokens  : ${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out`);
console.log(`Cache hit     : ${avgCacheHit}% of input tokens served from cache`);
console.log(`Total wall ms : ${totalMs.toLocaleString()}ms`);
console.log(`\nBy model:`);

for (const [model, m] of Object.entries(byModel).sort((a, b) => b[1].costUsd - a[1].costUsd)) {
    const hitPct = m.in > 0 ? Math.round((m.cacheRead / m.in) * 100) : 0;
    console.log(
        `  ${model}\n` +
        `    calls=${m.calls}  in=${m.in.toLocaleString()}  out=${m.out.toLocaleString()}` +
        `  cache=${hitPct}%  cost=$${m.costUsd.toFixed(5)}  avg=${Math.round(m.ms / m.calls)}ms/call`,
    );
}
console.log();
