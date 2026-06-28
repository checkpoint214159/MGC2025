// Aggregate memory/context observability from .dev/server.log (TODO item 10).
// Parses [memory] (per-generation context snapshot) and [memory-consolidation] (compression)
// JSON lines and prints how context size + compaction evolve over a run, so you can judge
// whether the memory system is actually compressing context and staying bounded.
//
//   npm run memory          # full session
//   npm run memory -- --last N
//
// Exit 0 always (reporting tool, not a gate).

import { readFileSync, existsSync } from "node:fs";

const LOG_PATH = ".dev/server.log";
const args = process.argv.slice(2);
const lastN = (() => {
    const i = args.indexOf("--last");
    return i >= 0 ? Number(args[i + 1]) || 0 : 0;
})();

if (!existsSync(LOG_PATH)) {
    console.log(`No log at ${LOG_PATH} — run \`npm run dev:logged\` to capture it.`);
    process.exit(0);
}

const lines = readFileSync(LOG_PATH, "utf8").split("\n");

function extract(tag) {
    const marker = `[${tag}] `;
    return lines
        .filter((l) => l.includes(marker))
        .map((l) => {
            try {
                return JSON.parse(l.slice(l.indexOf(marker) + marker.length));
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

let snapshots = extract("memory");
let consolidations = extract("memory-consolidation");
if (lastN > 0) snapshots = snapshots.slice(-lastN);

if (snapshots.length === 0 && consolidations.length === 0) {
    console.log("No [memory] / [memory-consolidation] records yet. Run a trajectory with `npm run dev:logged`.");
    process.exit(0);
}

const n = (v) => (typeof v === "number" ? v : 0);

// ── Per-generation context snapshots ────────────────────────────────────────
if (snapshots.length) {
    console.log("\n━━ Context per generation (memory compaction) ━━");
    console.log(
        "day  phase           hist  memC  digC  rollC  rawC  transcript→conv   ratio",
    );
    for (const s of snapshots) {
        const day = String(s.recoveryDay ?? "?").padStart(3);
        const phase = String(s.phase ?? "?").padEnd(14);
        const conv = n(s.conversationalContextChars ?? s.compactedContextChars);
        console.log(
            `${day}  ${phase}  ${String(n(s.statesInHistory)).padStart(4)}  ` +
                `${String(n(s.memoryChars)).padStart(4)}  ${String(n(s.digestChars)).padStart(4)}  ` +
                `${String(n(s.rollingChars)).padStart(5)}  ${String(n(s.rawWindowChars)).padStart(4)}  ` +
                `${String(n(s.fullTranscriptChars)).padStart(7)}→${String(conv).padStart(6)}  ` +
                `${String(s.compactionRatio ?? 1).padStart(5)}×`,
        );
    }
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const convOf = (s) => n(s.conversationalContextChars ?? s.compactedContextChars);
    console.log(
        `\n  transcript: ${n(first.fullTranscriptChars)} → ${n(last.fullTranscriptChars)}c | ` +
            `conversational context (memory+raw): ${convOf(first)} → ${convOf(last)}c | ` +
            `compaction: ${first.compactionRatio ?? 1}× → ${last.compactionRatio ?? 1}×`,
    );
    const ratios = snapshots.map((s) => s.compactionRatio ?? 1);
    console.log(
        `  peak compaction ${Math.max(...ratios)}× · mean conversational context ${Math.round(
            snapshots.reduce((a, s) => a + convOf(s), 0) / snapshots.length,
        )}c (memory keeps this bounded as the transcript grows)`,
    );
}

// ── Consolidation passes ────────────────────────────────────────────────────
if (consolidations.length) {
    console.log("\n━━ Consolidation passes (raw prose → memory) ━━");
    for (const c of consolidations) {
        console.log(
            `  day ${c.recoveryDay ?? "?"} (${c.phase}) [${c.trigger}]: folded ${n(
                c.rawFoldedChars,
            )}c/${n(c.rawMsgs)}msg → +${n(c.memoryDeltaChars)}c memory, +${n(
                c.newFacts,
            )} fact(s) · ${c.compressionRatio}× compression`,
        );
    }
} else {
    console.log("\n  (no consolidation passes yet — raw window never crossed the threshold)");
}

console.log();
process.exit(0);
