// Plan-distance mutation suite (TODO 12.2).
//
// For each fixture (a persona with lifestyle features + scripted "tell Wally" events), runs a
// simulated recovery with the clinician anchor set, and reports how the plan-distance metric
// responds to semantic mutations: the plan should ADAPT to the patient's day (the agentic
// promise) while D stays within the clinician's intent (the regularization promise).
//
//   npm run dev:logged
//   npm run harness:distance                    # all fixtures, 14 days each (spec default)
//   npm run harness:distance -- days=4          # cheaper observation run
//   npm run harness:distance -- only=kopitiam-uncle,polyclinic-haze
//
// No hard prior on D values: the suite prints the per-day distance trajectory (event days
// marked) and asserts only run-health (green trajectory) + that distance stayed computable.
// Exit 0 if every selected run was green.

import { spawn } from "node:child_process";
import { COLOSTOMY_SG_FIXTURES } from "./fixtures/colostomy-sg.mjs";

const args = Object.fromEntries(
    process.argv
        .slice(2)
        .map((t) => t.match(/^(\w+)=([\s\S]*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]]),
);
const DAYS = Number(args.days ?? 14);
const selected = args.only
    ? args.only.split(",").map((s) => s.trim())
    : COLOSTOMY_SG_FIXTURES.map((f) => f.name);

function runFixture(fixture) {
    return new Promise((resolve) => {
        console.log(
            `\n${"═".repeat(72)}\n▶ FIXTURE: ${fixture.name} — ${fixture.blurb}\n` +
                `  expect: ${fixture.expect}\n${"═".repeat(72)}`,
        );
        const child = spawn(
            "node",
            [
                "scripts/harness/e2e-trajectory.mjs",
                `days=${DAYS}`,
                `name=${fixture.name}`,
                "anchor=default",
                `events=${JSON.stringify(fixture.events)}`,
                `policy=${fixture.policy}`,
            ],
            { env: process.env },
        );
        let out = "";
        child.stdout.on("data", (d) => {
            out += d.toString();
            process.stdout.write(d);
        });
        child.stderr.on("data", (d) => process.stderr.write(d));
        child.on("close", (code) => {
            const m = out.match(/\[\[RESULT\]\] (\{.*\})/);
            let result = null;
            if (m) {
                try {
                    result = JSON.parse(m[1]);
                } catch {
                    /* ignore */
                }
            }
            resolve({ name: fixture.name, code, result });
        });
    });
}

function sparkline(series) {
    if (!series?.length) return "(no distance data)";
    return series
        .map((p) => `d${p.day}${p.event ? "💬" : ""}:${p.D}`)
        .join(" → ");
}

async function main() {
    console.log(
        `\n━━ Distance mutation suite — ${selected.length} fixture(s) × ${DAYS} days ━━`,
    );
    const runs = [];
    for (const name of selected) {
        const fixture = COLOSTOMY_SG_FIXTURES.find((f) => f.name === name);
        if (!fixture) {
            console.error(
                `✖ unknown fixture "${name}" (have: ${COLOSTOMY_SG_FIXTURES.map((f) => f.name).join(", ")})`,
            );
            continue;
        }
        runs.push(await runFixture(fixture));
    }

    console.log(`\n${"═".repeat(72)}\n📏 DISTANCE SUITE SUMMARY\n${"═".repeat(72)}`);
    let allGreen = true;
    for (const r of runs) {
        const green = r.code === 0;
        if (!green) allGreen = false;
        const series = r.result?.distanceSeries ?? [];
        const ds = series.map((p) => p.D);
        const maxD = ds.length ? Math.max(...ds) : null;
        const eventDs = series.filter((p) => p.event).map((p) => p.D);
        console.log(
            `\n${green ? "✅" : "❌"} ${r.name} ${r.result ? `(${r.result.green}/${r.result.total})` : ""}`,
        );
        console.log(`   D trajectory: ${sparkline(series)}`);
        console.log(
            `   max D=${maxD ?? "?"} · event-day D=[${eventDs.join(", ") || "—"}] · ` +
                `flag threshold 0.35 · flags: [${r.result?.flags?.join(", ") || "none"}]`,
        );
    }
    console.log(
        `\n── distance suite: ${runs.filter((r) => r.code === 0).length}/${runs.length} runs green ──`,
    );
    process.exit(allGreen ? 0 : 1);
}

main().catch((e) => {
    console.error("distance suite crashed:", e);
    process.exit(1);
});
