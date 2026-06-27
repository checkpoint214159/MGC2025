// Static verify gate: typecheck + lint + unit tests. Runs all three (doesn't stop
// at the first failure) so one pass shows the whole picture, then exits non-zero if
// any failed. This is the cheap, deterministic, no-LLM, no-server gate the loop runs
// after every change.
//
//   npm run check

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

function run(cmd, args) {
    const r = spawnSync(cmd, args, { encoding: "utf8" });
    return { code: r.status ?? 1, out: (r.stdout || "") + (r.stderr || "") };
}

const results = [];

// 1. Typecheck. tsc exits non-zero on ANY error including stale generated
// .next/types — filter those out and judge on real source errors only.
process.stdout.write("▶ typecheck…\n");
const tsc = run("npx", ["tsc", "--noEmit"]);
const tscErrors = tsc.out
    .split("\n")
    .filter((l) => /error TS/.test(l) && !l.startsWith(".next/"));
results.push({
    name: "typecheck",
    ok: tscErrors.length === 0,
    detail: tscErrors.length ? `${tscErrors.length} error(s)` : "clean",
    body: tscErrors.slice(0, 20).join("\n"),
});

// 2. Lint — only the uncommitted working set (changed vs HEAD + untracked), i.e. what
// this iteration actually touched. The legacy codebase has many pre-existing lint errors;
// gating the loop on the whole repo (or the whole branch vs main) would be permanently red
// and useless. Clean up what you touch; don't answer for committed history.
process.stdout.write("▶ lint (changed files)…\n");
const LINT_EXT = /\.(t|j)sx?$|\.mjs$/;
// Explicit file args win (the loop passes exactly what it touched). Otherwise default
// to the uncommitted working set (changed vs HEAD + untracked).
const cliFiles = process.argv.slice(2).filter((f) => LINT_EXT.test(f));
let candidates;
if (cliFiles.length) {
    candidates = cliFiles;
} else {
    const trackedFiles = run("git", ["diff", "--name-only", "HEAD"]).out.split("\n");
    const untracked = run("git", [
        "ls-files",
        "--others",
        "--exclude-standard",
    ]).out.split("\n");
    candidates = [...trackedFiles, ...untracked];
}
const changed = [...new Set(candidates)]
    .map((f) => f.trim())
    .filter((f) => f && LINT_EXT.test(f))
    .filter((f) => existsSync(f));
if (changed.length === 0) {
    results.push({ name: "lint", ok: true, detail: "no changed files", body: "" });
} else {
    const lint = run("npx", ["eslint", ...changed]);
    results.push({
        name: "lint",
        ok: lint.code === 0,
        detail:
            lint.code === 0
                ? `clean (${changed.length} file${changed.length > 1 ? "s" : ""})`
                : `problems in ${changed.length} changed file(s)`,
        body: lint.code === 0 ? "" : lint.out.trim(),
    });
}

// 3. Unit tests.
process.stdout.write("▶ test…\n");
const test = run("npx", ["vitest", "run"]);
const passLine =
    test.out.split("\n").find((l) => /Tests\s+\d+ passed/.test(l)) ?? "";
results.push({
    name: "test",
    ok: test.code === 0,
    detail: passLine.trim() || (test.code === 0 ? "passed" : "failed"),
    body: test.code === 0 ? "" : test.out.trim().split("\n").slice(-30).join("\n"),
});

console.log("\n── check summary ─────────────────────────────");
for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name.padEnd(10)} ${r.detail}`);
}
const failed = results.filter((r) => !r.ok);
if (failed.length) {
    console.log("\n── details ───────────────────────────────────");
    for (const r of failed) {
        if (r.body) console.log(`\n[${r.name}]\n${r.body}`);
    }
}
process.exit(failed.length ? 1 : 0);
