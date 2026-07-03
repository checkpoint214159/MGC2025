// Multi-policy trajectory suite (TODO item 10.1).
//
// Runs the policy-driven trajectory (e2e-trajectory.mjs) across several contrasting patient
// policies and prints a comparison. The point: verify the system distinguishes clinically
// different patients — someone who ISN'T trying (low compliance) from someone who IS trying but
// ISN'T improving (compliant + stagnant pain) from someone recovering normally.
//
//   npm run dev:logged
//   npm run harness:policies                 # all policies, default days
//   npm run harness:policies -- days=7
//   npm run harness:policies -- only=standard,worsening
//
// Exit 0 if every selected run was green, else 1.

import { spawn } from "node:child_process";

const args = Object.fromEntries(
    process.argv
        .slice(2)
        .map((t) => t.match(/^(\w+)=([\s\S]*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]]),
);
const DAYS = Number(args.days ?? 5);
const THRESHOLD = Number(args.complianceThreshold ?? 50);

// Each policy is a natural-language conditioning string for the Claude-agent patient. We hold
// NO prior on which flags fire — the suite reports what each policy actually produced.
const POLICIES = {
    reluctant: {
        blurb: "isn't following the plan",
        policy:
            "Reluctant patient with low motivation. Complete only about 30% of each prescribed " +
            "task each day (sometimes 20-40%). Your pain holds steady around 6/10 and does not improve.",
    },
    standard: {
        blurb: "follows the plan and improves",
        policy:
            "Standard, motivated patient. Follow most of the plan each day — about 80% of each " +
            "task (it varies a little). Your pain steadily improves over time, dropping roughly one " +
            "point every couple of days from 6 down toward 2.",
    },
    worsening: {
        blurb: "follows the plan but does NOT improve",
        policy:
            "Diligent but deteriorating patient. Follow the plan well — complete about 90% of each " +
            "task every day. BUT your pain does NOT improve: it stays high around 7/10 and may even " +
            "creep upward, despite your good compliance.",
    },
};

const selected = args.only
    ? args.only.split(",").map((s) => s.trim())
    : Object.keys(POLICIES);

function runPolicy(name) {
    return new Promise((resolve) => {
        const { policy } = POLICIES[name];
        console.log(`\n${"═".repeat(72)}\n▶ POLICY: ${name} — ${POLICIES[name].blurb}\n${"═".repeat(72)}`);
        const child = spawn(
            "node",
            [
                "scripts/harness/e2e-trajectory.mjs",
                `days=${DAYS}`,
                `name=${name}`,
                `complianceThreshold=${THRESHOLD}`,
                // Persona passthrough: run the same policy matrix across different patients
                ...(args.preset ? [`preset=${args.preset}`] : []),
                `policy=${policy}`,
            ],
            { env: process.env },
        );
        let out = "";
        child.stdout.on("data", (d) => {
            out += d.toString();
            process.stdout.write(d); // stream live
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
            resolve({ name, code, result });
        });
    });
}

async function main() {
    console.log(
        `\n━━ Policy suite — ${selected.length} policies × ${DAYS} days (complianceThreshold ${THRESHOLD}%) ━━`,
    );
    const runs = [];
    for (const name of selected) {
        if (!POLICIES[name]) {
            console.error(`✖ unknown policy "${name}" (have: ${Object.keys(POLICIES).join(", ")})`);
            continue;
        }
        runs.push(await runPolicy(name));
    }

    // ── Comparison ──
    console.log(`\n${"═".repeat(72)}\n📊 POLICY SUITE SUMMARY\n${"═".repeat(72)}`);
    console.log(
        "policy      result   flags fired                meanCompl  lastPain  compaction",
    );
    let allGreen = true;
    for (const r of runs) {
        const res = r.result;
        const green = r.code === 0;
        if (!green) allGreen = false;
        const flags = res?.flags?.length ? res.flags.join(",") : "none";
        console.log(
            `${r.name.padEnd(11)} ${(green ? "✅ " + (res ? `${res.green}/${res.total}` : "") : "❌ FAIL").padEnd(8)} ` +
                `${flags.padEnd(25)}  ${String(res?.meanCompliance ?? "?").padStart(6)}%  ` +
                `${String(res?.lastPain ?? "?").padStart(7)}  ${String(res?.compaction ?? "?").padStart(8)}×`,
        );
    }

    // Sanity contrast (informational — we hold no hard prior, but flag obviously-wrong outcomes):
    console.log("\nExpected clinical contrast (informational):");
    console.log("  reluctant → low_compliance · standard → (few/none) · worsening → pain_stagnation");

    console.log(
        `\n── policy suite: ${runs.filter((r) => r.code === 0).length}/${runs.length} runs green ──`,
    );
    process.exit(allGreen ? 0 : 1);
}

main().catch((e) => {
    console.error("policy suite crashed:", e);
    process.exit(1);
});
