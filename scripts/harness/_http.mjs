// Shared HTTP client for harness drivers: a cookie jar + signup + the real Auth.js
// credentials login. Pure fetch — no Prisma import (dodges the WASM-engine wall).

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createClient(base = process.env.HARNESS_BASE ?? "http://localhost:3000") {
    const jar = new Map();

    function absorb(res) {
        for (const c of res.headers.getSetCookie?.() ?? []) {
            const pair = c.split(";")[0];
            const eq = pair.indexOf("=");
            if (eq < 0) continue;
            const name = pair.slice(0, eq).trim();
            const val = pair.slice(eq + 1).trim();
            if (val === "") jar.delete(name);
            else jar.set(name, val);
        }
    }
    const cookieHeader = () =>
        [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

    async function hfetch(path, opts = {}) {
        const res = await fetch(base + path, {
            ...opts,
            redirect: "manual",
            headers: { ...(opts.headers || {}), cookie: cookieHeader() },
        });
        absorb(res);
        return res;
    }
    async function json(path, opts) {
        const res = await hfetch(path, opts);
        let body = null;
        try {
            body = await res.json();
        } catch {
            /* non-JSON */
        }
        return { res, body };
    }
    const postJson = (path, data) =>
        json(path, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(data),
        });

    const signup = (email, username, password) =>
        postJson("/api/auth/signup", { email, username, password });

    async function login(email, password) {
        const { body: csrf } = await json("/api/auth/csrf");
        const form = new URLSearchParams({
            csrfToken: csrf?.csrfToken ?? "",
            email,
            password,
            callbackUrl: base + "/",
            json: "true",
        });
        await hfetch("/api/auth/callback/credentials", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: form.toString(),
        });
        return [...jar.keys()].some((k) => k.includes("session-token"));
    }
    const session = async () => (await json("/api/auth/session")).body;

    async function up() {
        try {
            await fetch(base, { redirect: "manual" });
            return true;
        } catch {
            return false;
        }
    }

    return { base, jar, hfetch, json, postJson, signup, login, session, up };
}
