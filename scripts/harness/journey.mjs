// Harness journey driver (Phase 1).
//
// Pure HTTP against the running dev server — NO prisma import, so it sidesteps the
// WASM-engine wall that blocks standalone tsx scripts. It seeds a harness patient,
// logs in via the real Auth.js credentials flow, then drives authenticated routes and
// scans the dev log for failures after each step.
//
//   npm run dev:logged      # in one terminal (so logs are captured)
//   npm run harness         # in another
//
// Exit 0 = all green, 1 = something failed.

import { scanLog, logSize, sleep } from "./_shared.mjs";

const BASE = process.env.HARNESS_BASE ?? "http://localhost:3000";

// ── minimal cookie jar ────────────────────────────────────────────────────────
const jar = new Map();
function absorb(res) {
    const cookies = res.headers.getSetCookie?.() ?? [];
    for (const c of cookies) {
        const pair = c.split(";")[0];
        const eq = pair.indexOf("=");
        if (eq < 0) continue;
        const name = pair.slice(0, eq).trim();
        const val = pair.slice(eq + 1).trim();
        if (val === "") jar.delete(name);
        else jar.set(name, val);
    }
}
function cookieHeader() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function hfetch(path, opts = {}) {
    const res = await fetch(BASE + path, {
        ...opts,
        redirect: "manual",
        headers: { ...(opts.headers || {}), cookie: cookieHeader() },
    });
    absorb(res);
    return res;
}

// ── result tracking ─────────────────────────────────────────────────────────
const results = [];
function record(name, ok, detail) {
    results.push({ name, ok });
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
    // Preflight: server up?
    try {
        await fetch(BASE, { redirect: "manual" });
    } catch {
        console.error(`✖ dev server not reachable at ${BASE}. Run \`npm run dev:logged\`.`);
        process.exit(1);
    }
    const logAvailable = logSize() > 0 || scanLog(0).available;
    if (!logAvailable) {
        console.log(
            "⚠️  no .dev/server.log — runtime log scanning is OFF. Start with `npm run dev:logged` to enable it.\n",
        );
    }

    // 1. Seed (or reuse) the harness patient.
    let creds;
    try {
        const res = await hfetch("/api/dev/seed-patient", { method: "POST" });
        creds = await res.json();
        record("seed patient", res.ok && !!creds.email, creds.email ?? creds.error);
        if (!res.ok) return finish();
    } catch (e) {
        record("seed patient", false, String(e));
        return finish();
    }

    // 2. Log in via the Auth.js credentials flow (csrf → callback).
    const csrf = await (await hfetch("/api/auth/csrf")).json();
    const form = new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email: creds.email,
        password: creds.password,
        callbackUrl: BASE + "/",
        json: "true",
    });
    await hfetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
    });
    const hasSession = [...jar.keys()].some((k) => k.includes("session-token"));
    record("login (cookie set)", hasSession);

    // 3. Session is actually valid (definitive auth check).
    const session = await (await hfetch("/api/auth/session")).json();
    const sessionOk = session?.user?.email === creds.email;
    record("session valid", sessionOk, session?.user?.email ?? "no user");

    // 4. Authenticated route smoke. Each: assert status, then scan the log delta for
    //    failures the request produced. NOTE: curl runs no JS, so this catches SERVER-side
    //    failures (SSR/RSC/route/action crashes, 500s, prisma errors) — not client-only
    //    React warnings, which only reach the log via a real browser ([browser] lines).
    //    Browser-level checks are a later phase.
    const journeys = [
        { name: "dashboard renders", path: "/patient/dashboard" },
        { name: "chat renders", path: "/chat" },
        { name: "onboarding redirect (done user)", path: "/patient/info" },
    ];
    for (const j of journeys) {
        const before = logSize();
        const res = await hfetch(j.path);
        await res.text();
        await sleep(600); // let async server logs flush
        const { findings } = scanLog(before);
        const ok = res.status === 200 && findings.length === 0;
        record(
            j.name,
            ok,
            `status ${res.status}${findings.length ? `, ${findings.length} log error(s)` : ""}`,
        );
        for (const f of findings.slice(0, 5)) console.log("    ⤷ " + f);
    }

    finish();
}

function finish() {
    const failed = results.filter((r) => !r.ok).length;
    console.log(
        `\n── journey summary: ${results.length - failed}/${results.length} green ──`,
    );
    process.exit(failed ? 1 : 0);
}

main().catch((e) => {
    console.error("journey crashed:", e);
    process.exit(1);
});
