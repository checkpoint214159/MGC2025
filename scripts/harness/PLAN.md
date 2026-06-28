# Dev harness — handoff & roadmap

Self-contained context for continuing the **agent feedback-loop** work in a fresh session.
Ignore any UI/design history; this doc is only about the harness/loop engineering.

## Why this exists

Goal: let an agent change this app, then **verify it actually works** — run the app, drive it,
observe failures, fix them — without a human hand-pasting dev-server logs. The "loop" is trivial
once the app has eyes (log capture) and hands (a driver). Phases 0–1 built that substrate.

## What's DONE (Phase 0 + 1) — all green, validated

Two-terminal workflow:

```bash
npm run dev:logged        # Terminal 1: next dev, stdout/stderr teed to .dev/server.log (gitignored)
npm run check             # static gate: tsc + eslint(changed files) + vitest
npm run harness           # seed → login → drive authed routes → scan log delta (smoke)
npm run harness:onboarding# E2E: fresh user → real onboarding graph → profile → dashboard (real LLM)
npm run harness:scan      # standalone scan of .dev/server.log
```

Files:

-   `scripts/harness/_shared.mjs` — the **failure watchlist** (regexes grown from real bugs) + `scanLog(offset)`.
-   `scripts/harness/check.mjs` — static gate. Lints ONLY changed files (explicit args win, else uncommitted-vs-HEAD + untracked). The legacy tree has heavy pre-existing lint debt, so whole-repo lint would be permanently red. tsc/vitest are whole-project.
-   `scripts/harness/journey.mjs` — pure-HTTP driver (global `fetch`, a tiny cookie jar, **no Prisma import**). Seeds via `POST /api/dev/seed-patient`, logs in through the real Auth.js credentials flow (GET `/api/auth/csrf` → POST `/api/auth/callback/credentials`), asserts `/api/auth/session`, then GETs authed routes asserting 200 + scanning the per-request log delta.
-   `app/api/dev/seed-patient/route.ts` — dev-only, idempotent harness patient (`harness@test.local` / `harness-password`). Reuse-if-complete, scrap-partial-and-reseed.
-   `scripts/harness/_http.mjs` — shared HTTP client (cookie jar + signup + Auth.js login + session). Used by the E2E driver.
-   `scripts/harness/e2e-onboarding.mjs` — **full onboarding E2E** (see below).
-   `app/api/dev/onboarding/route.ts` — dev bridge: `POST {op: biometrics|start|state|resume}` → calls the onboarding **service** fns with the `auth()` user (server actions aren't curl-able).
-   `scripts/harness/README.md` — usage docs.
-   `package.json` — added `dev:logged`, `check`, `harness`, `harness:onboarding`, `harness:scan`.

Two journeys, both green:

-   `harness` (6 checks) — seed, login, session, GET smoke on `/patient/dashboard`, `/chat`, `/patient/info`.
-   `harness:onboarding` (9 checks) — fresh user → login → biometrics → screening → the **real LLM-generated questions** (answered by an answer-bot keyed on `inputType`) → profile generated + saved → `doneOnboarding` true → dashboard renders. This is a real integration test of the whole onboarding graph, validated end-to-end.

## HARD CONSTRAINTS (learned the hard way — don't relearn them)

1. **Neon HTTP = no transactions.** `lib/prisma.ts` uses `PrismaNeonHTTP`. Any implicit/explicit
   transaction throws `Transactions are not supported in HTTP mode`. This includes: `$transaction`,
   `createMany`/`updateMany`/`deleteMany`, **nested relation writes** (`create` with nested
   `create`, even a single one), `create`/`update` **with `include`**, and **`upsert` with an empty
   `update: {}`**. Safe: single-row create/update/delete by id; `upsert` with non-empty `update`;
   reads. The harness already caught & fixed two such bugs in `seedPatient`. See memory
   `neon-http-no-transactions`.
2. **Standalone `tsx` scripts can't touch the DB.** The generated Prisma client uses a WASM engine
   that only initializes inside the Next runtime; raw `node`/`tsx` import throws a WASM `LinkError`.
   ⇒ **All DB work in the harness goes through dev API routes**, never standalone scripts.
3. **curl runs no JS** ⇒ the driver sees SERVER-side failures (SSR/RSC/route/action crashes, 500s,
   prisma errors), NOT client-only React warnings (those reach the log as `[browser] …` lines only
   with a real browser connected). This is the main reason Phase 4 (browser) exists.
4. **LangGraph graphs are module-eval singletons**; the onboarding checkpointer is an in-memory
   `MemorySaver` (per-isolate, not durable). Don't restart the dev server mid-journey, and after
   editing a graph node the server may need a restart for it to take effect.
5. `lib/prisma.ts` still has a TEMP `$extends` `[prisma] Model.op ✅/❌` per-op logger (useful for
   tracing the offending call). Leave it or remove it — it's harmless but noisy.

## Definition of "done" for any change (the verify gate)

A change isn't done until: `npm run check` is green AND the relevant journeys pass — `npm run
harness` (smoke) and, for anything touching onboarding/auth/state, `npm run harness:onboarding`
(and the Phase-2 trajectory suite once it exists) — with `dev:logged` running so log-scan is live.
Add a regex to `WATCHLIST` in `_shared.mjs` whenever a new failure mode appears — that's the
harness's memory.

---

## NEXT: Phase 2 — E2E trajectory suite (real flows, real LLM)

**DIRECTION CHANGE (2026-06-27): we are NOT stubbing the LLM.** Cost + nondeterminism are
acceptable. The goal is a thorough integration suite that drives the REAL flows end-to-end, so
the workflow becomes: prompt for a feature → Claude builds it → runs this suite → debugs any
failures in-loop → ships verified.

**The enabler:** the harness already authenticates; the only gap was driving React Server Actions
(not curl-able). Pattern = thin **dev-only routes that call the underlying service fns with the
`auth()` user**. `app/api/dev/onboarding/route.ts` is the template. This also means the seeded/
onboarded user's `userId` comes from the session cookie — no userId plumbing.

**DONE — slice 1: onboarding from scratch** (`npm run harness:onboarding`, 9/9). Fresh user →
biometrics → screening → the real LLM question chain (answer-bot in `e2e-onboarding.mjs` answers by
`inputType`) → profile generated + saved → `doneOnboarding` → dashboard. Proves the hardest part:
driving the real server-action graph loop with a checkpointed LangGraph.

**TODO — slice 2: the STATE TRAJECTORY.** Drive the recovery loop over multiple simulated days and
assert invariants, producing a realistic chain of states to test against.

-   Service surface: `fetchStateAction(date, admin_force)` auto-generates a State (modules
    exercise/nutrition/sleep/symptoms) when none is active; `updateModuleProgress(moduleId, updates)`
    logs progress; date is a param, and `surgeryDate` drives `recoveryDay`, so later dates = later
    recovery days.
-   Build `app/api/dev/state/route.ts`: `POST {op:"fetch", date}` → `fetchStateAction(new Date(date), true)`;
    `POST {op:"log", moduleId, updates}` → `updateModuleProgress`. (dev-gated, `auth()` user.)
-   Build `scripts/harness/e2e-trajectory.mjs`: seed/onboard a patient, then for day = 1..N: fetch
    state → log progress on each module (incl. a pain value in symptoms) → advance the date → repeat.
    Assert per step: state generates, modules present, pain feeds the arc/chart, streak increments,
    the progress-based clinician flags fire at the right thresholds (nearing-completion / 7-day stall
    / 2-day drop — see recent git history), and the causal state chain links day→day.
-   Watch: state-gen is ~10–20s/day (LLM); an N-day run is minutes — keep N small (3–5) for the loop,
    longer trajectories are an outer/nightly concern. Don't restart the server mid-run (the
    onboarding MemorySaver checkpoint is per-isolate).

Together, slices 1+2 = a full lifecycle regression suite (onboard → daily tracking → state
evolution) that exercises real LLM generation, the engagement adapter, flags, and the DB writes.

## THEN: Phase 3 — wire the autonomous loop against TODO.md

**Goal:** `/loop` (or `ScheduleWakeup` self-paced) that drives: read `TODO.md` → pick top item →
implement → run the verify gate (`check` + `harness`, scan logs) → fix or mark the item done →
repeat.

**Build / shape:**

1. Make `TODO.md` loop-parseable (checkbox items, top = next). Decide the backlog ordering.
2. Loop prompt encodes the gate discipline: nothing is "done" until `check` green + the relevant
   journeys pass. Pass the exact touched files to `check` for a precise lint scope.
3. **Commit per green iteration** on a feature branch — this also keeps the `check` lint scope
   (uncommitted-vs-HEAD) tight for the next iteration.

**GUARDRAILS (non-negotiable):**

-   Branch-isolated; **never main**; no commit-to-main, push, or PR without explicit approval.
-   **Dev DB only.** Destructive ops (Force re-onboard, cascade deletes) only on seeded test users.
-   **LLM budget cap**; default to `HARNESS_FIXTURES=1`. Real-LLM journeys are an explicit, sparse
    outer concern, not the tight loop.
-   **Stop conditions:** N iterations with no green progress → stop and summarize; don't thrash.
-   **Pause on ambiguity:** product/design forks get asked, not guessed.
-   **Don't restart the dev server mid-journey** (MemorySaver / graph singletons).

## LATER: Phase 4 — browser automation (closes the remaining gaps)

Wire Playwright or a Chrome-DevTools/Playwright MCP so the driver runs real JS. Unlocks:
client-only error capture (the `[browser]` React warnings curl can't see), screenshots for
visual/UX regression, and driving server-actions through the actual UI (onboarding resume,
logging) instead of dev-REST shims. This is what makes "shell renders" become "the populated UI
is correct."

## Recommended first action in the new session

Confirm the substrate still works (`npm run dev:logged` in one terminal, `npm run check` +
`npm run harness` in another — expect 6/6), then start Phase 2 with the fixture flag + one
fixtured journey (dashboard-with-real-modules) before touching the autonomous loop. Don't turn on
Phase 3 until Phase 2 journeys are trustworthy — an autonomous loop on weak verification just
produces confident, unverified changes.
