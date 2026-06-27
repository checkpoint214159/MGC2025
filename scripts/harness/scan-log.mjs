// CLI: scan the dev server log for known failure patterns.
//
//   node scripts/harness/scan-log.mjs            # scan whole log
//   node scripts/harness/scan-log.mjs <offset>   # scan from byte offset
//
// Exit 0 = clean (or no log), 2 = failures found.

import { scanLog } from "./_shared.mjs";

const offset = Number(process.argv[2] ?? 0) || 0;
const { available, findings } = scanLog(offset);

if (!available) {
    console.log(
        "⚠️  no .dev/server.log found — start the server with `npm run dev:logged`",
    );
    process.exit(0);
}

if (findings.length === 0) {
    console.log("✅ log clean — no known failure patterns");
    process.exit(0);
}

console.log(`❌ ${findings.length} failure line(s) in log:`);
for (const f of findings) console.log("  ⤷ " + f);
process.exit(2);
