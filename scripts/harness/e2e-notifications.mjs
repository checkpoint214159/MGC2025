// E2E notifications journey.
//
// Verifies the full notification surface:
//   - subscribe/unsubscribe endpoint (auth + DB round-trip via server response)
//   - cron endpoint auth (401 without secret, 200 with it)
//   - cron actually runs without crashing (email/push delivery may fail for the
//     harness@test.local address — that's expected; we assert graceful errors not crashes)
//   - log scan for any server-side panic after each step
//
//   npm run dev:logged              # terminal 1
//   npm run harness:notifications   # terminal 2
//
// Exit 0 = all green, 1 = a step failed.

// Load .env.local so CRON_SECRET is available without requiring it to be exported
// as a shell env var. Works because the script runs from the project root.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, sleep } from "./_http.mjs";
import { scanLog, logSize } from "./_shared.mjs";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const BASE = process.env.HARNESS_BASE ?? "http://localhost:3000";

const c = createClient(BASE);
const results = [];

function record(name, ok, detail) {
    results.push({ name, ok });
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function postJson(path, body) {
    const before = logSize();
    const { res, body: resBody } = await c.postJson(path, body);
    await sleep(300);
    const { findings } = scanLog(before);
    return { res, body: resBody, findings };
}

// A syntactically valid-looking (but fake) Web Push subscription. The server
// stores it as-is; the cron will attempt to send and get a network error, which
// push.ts handles gracefully and logs in the `errors` array.
const FAKE_SUB = {
    endpoint: `https://fcm.googleapis.com/fcm/send/harness-test-${Date.now()}`,
    keys: {
        // Real web push keys are base64url; these are the right length / charset for storage.
        p256dh: "BCVxsr7N_eNgVRqvHtD5KzQsNkXl02tn4MX9-WcJJQEFQN3X_3PQBhTLgcEbXMgMBjYd_kUrQxd8M1LbN_MBzIY=",
        auth: "Yzg1ZTg5MGUtNWM4My00",
    },
};

async function main() {
    if (!(await c.up())) {
        console.error(`✖ dev server not reachable at ${BASE}. Run \`npm run dev:logged\`.`);
        process.exit(1);
    }
    if (logSize() === 0) {
        console.log("⚠️  no .dev/server.log — runtime log scanning is OFF (run `npm run dev:logged`).\n");
    }
    if (!CRON_SECRET) {
        console.error("✖ CRON_SECRET not set in .env.local — cron tests will fail.");
        process.exit(1);
    }

    // 1. Seed + login the harness patient.
    const { res: sr, body: creds } = await c.postJson("/api/dev/seed-patient", {});
    record("seed harness patient", sr.ok && !!creds?.email, creds?.error ?? creds?.email);
    if (!sr.ok) process.exit(1);

    record("login", await c.login(creds.email, creds.password));
    const sess = await c.session();
    record("session valid", !!sess?.user?.id, sess?.user?.email);
    if (!sess?.user?.id) process.exit(1);

    // ── Subscribe ──────────────────────────────────────────────────────────────
    console.log("\n── Push subscribe ──");

    const { res: subRes, body: subBody, findings: subF } = await postJson(
        "/api/notifications/subscribe",
        FAKE_SUB,
    );
    record(
        "POST subscribe → 200",
        subRes.status === 200 && subBody?.ok && !subF.length,
        subBody?.error ?? (subF.length ? `${subF.length} log error(s)` : undefined),
    );

    // Re-subscribing the same endpoint should be idempotent (upsert).
    const { res: sub2Res, body: sub2Body } = await postJson(
        "/api/notifications/subscribe",
        FAKE_SUB,
    );
    record("re-subscribe same endpoint is idempotent", sub2Res.status === 200 && sub2Body?.ok);

    // ── Cron auth ─────────────────────────────────────────────────────────────
    console.log("\n── Cron auth ──");

    const noAuth = await c.postJson("/api/notifications/cron", {});
    record("cron without auth → 401", noAuth.res.status === 401, `status ${noAuth.res.status}`);

    const badAuth = await fetch(BASE + "/api/notifications/cron", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer wrong-secret" },
        body: "{}",
    });
    record("cron with wrong secret → 401", badAuth.status === 401, `status ${badAuth.status}`);

    // ── Cron execution ────────────────────────────────────────────────────────
    console.log("\n── Cron execution ──");

    const before = logSize();
    const cronRes = await fetch(BASE + "/api/notifications/cron", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${CRON_SECRET}`,
        },
        body: "{}",
    });
    await sleep(2000); // notification sends are async — let them flush + log
    const { findings: cronF } = scanLog(before);

    let cronBody = null;
    try { cronBody = await cronRes.json(); } catch {}

    record(
        "cron runs without crashing",
        cronRes.status === 200 && !cronBody?.error,
        cronBody?.error ?? `status ${cronRes.status}`,
    );
    record(
        "cron returns processed count",
        typeof cronBody?.processed === "number",
        `processed=${cronBody?.processed}`,
    );
    record(
        "no server-log panics during cron",
        cronF.length === 0,
        cronF.length ? `${cronF.length} error(s)` : undefined,
    );
    if (cronF.length) cronF.slice(0, 5).forEach((f) => console.log("    ⤷ " + f));

    // The harness patient has no state today → daily-nudge fires.
    // Email to harness@test.local will be rejected by Resend; that's expected to land
    // in `errors`, not `sent`. Verify: the result exists + at least one channel attempted.
    const harnessResult = cronBody?.results?.find(
        (r) => r.email === creds.email,
    );
    const attempted = (harnessResult?.sent?.length ?? 0) + (harnessResult?.errors?.length ?? 0);
    record(
        "harness patient processed by cron",
        !!harnessResult,
        harnessResult
            ? `sent=${harnessResult.sent.length}, errors=${harnessResult.errors.length}, skipped=${harnessResult.skipped.length}`
            : "not in results",
    );
    record(
        "nudge attempted (email or push)",
        attempted > 0,
        `${attempted} channel attempt(s)`,
    );

    // ── Unsubscribe ────────────────────────────────────────────────────────────
    console.log("\n── Push unsubscribe ──");

    const delBefore = logSize();
    const delRes = await fetch(BASE + "/api/notifications/subscribe", {
        method: "DELETE",
        headers: {
            "content-type": "application/json",
            cookie: [...c.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        body: JSON.stringify({ endpoint: FAKE_SUB.endpoint }),
        redirect: "manual",
    });
    await sleep(300);
    const { findings: delF } = scanLog(delBefore);
    let delBody = null;
    try { delBody = await delRes.json(); } catch {}
    record(
        "DELETE unsubscribe → 200",
        delRes.status === 200 && delBody?.ok && !delF.length,
        delBody?.error ?? (delF.length ? `${delF.length} log error(s)` : undefined),
    );

    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n── notifications E2E: ${results.length - failed}/${results.length} green ──`);
    process.exit(failed ? 1 : 0);
}

main().catch((e) => {
    console.error("notifications e2e crashed:", e);
    process.exit(1);
});
