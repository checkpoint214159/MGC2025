# Policy-driven E2E harness — plan (TODO items 7, 7.5, 8)

Living plan doc for the loop. Update the **Status** boxes as slices land so a fresh
context can resume without re-reading the whole transcript.

## Goal (from TODO)

Simulate realistic app↔patient interactions to verify features end-to-end. A
natural-language **policy** conditions a patient-simulator, which responds to each
day's generated plan (completing tasks to some degree, reporting pain). The harness
runs a multi-day trajectory and asserts the right flags + notifications fire — with
**no prior** about which flags trip; that emerges from the policy.

Invocation target: `npm run harness:trajectory policy="LENGTHY_POLICY_STRING"`

## Architecture decisions (made by main agent; revisit only if blocked)

-   **The "subagent" patient-simulator is an OpenRouter LLM call from the `.mjs` harness**,
    not a Claude Code Agent-tool spawn. Reason: the harness must run from `npm`, which
    cannot spawn Agent-tool subagents. A direct `fetch` to OpenRouter (key already in
    `.env.local`, loaded via dotenv like `e2e-notifications.mjs`) is self-contained,
    keeps the simulation reasoning **out of the main agent's context** (the stated goal),
    and is conditionable on-the-fly via the policy string.
-   **Continuity without context blowup**: each session writes a running markdown memory
    at `.dev/policy-sessions/<timestamp>.md`. Each day appends a 1–2 line summary; the
    simulator is fed a compact digest, not the full transcript.
-   **Compliance = daily % of goal-bearing tasks completed**, summed across ALL modules
    (exercise/nutrition/sleep/symptoms). Symptoms have `goal:0` so contribute 0 tasks and
    drop out naturally. This maps onto the existing `DayProgress` (0–100) flag series.
-   **Persistence (7.5)**: new `DailyMetric` table, one row per (user, day), holding
    `compliancePct`, `completedTasks`, `totalTasks`, `painScore`. Upserted (Neon-safe
    findUnique→update/create) whenever `updateModuleProgress` changes anything.
-   **Flags driven by persisted series**: `pain_stagnation` already exists. Add a
    `low_compliance` flag (compliance under threshold over a window). Threshold default
    in code, overridable by the harness command.

## Slices

### 7.5 — Backend compliance + pain persistence ✅ DONE (committed)

-   [x] `lib/engagement/compliance.ts`: `getDayCompliance` + `getComplianceSeries`.
-   [x] `low_compliance` flag in `flags.ts` (+ `getLowComplianceSignal`, threshold override).
-   [x] `DailyMetric` model + migration `20260628022538_add_daily_metric` + generate.
-   [x] `lib/metrics/service.ts`: upsert / get / recomputeForModule.
-   [x] Hooked into `updateModuleProgress`.
-   [x] `metrics` op + compliance in `flags` op on `/api/dev/state`.
-   [x] 12 unit tests in `compliance.test.ts`. check+harness green.
-   NOTE: live DB-persistence path verified in item 8 (needs server restarted after the
    prisma regen so the running client has `prisma.dailyMetric`).

### 7 — Policy harness infrastructure ☐ TODO

-   [ ] `scripts/harness/_simulator.mjs`: OpenRouter client + `decidePatientActions({
policy, profile, plan, memoryDigest })` → structured per-task decisions + pain.
-   [ ] `scripts/harness/_policy-memory.mjs`: read/append the session markdown memory.
-   [ ] Arg parsing: `policy="..."` (and optional `days=`, `complianceThreshold=`).
-   [ ] Succinct per-task logging: `day 3 · leglifts 7/10 · walk 12/20min · pain 6/10`.
-   [ ] `/api/dev/state` already exposes fetch/log/history/flags — extend if needed for
        DailyMetric + notification verification.

### 8 — 14-day policy trajectory test (replaces e2e-trajectory) ☐ TODO

-   [ ] `npm run harness:trajectory policy="..."` runs 14 simulated days via the 7 infra.
-   [ ] After the run: evaluate flags from persisted DailyMetric series.
-   [ ] Assert flag⟺notification consistency (no fixed prior): if `low_compliance` or
        `pain_stagnation` fires, the matching email/push must have been attempted (verify
        via cron endpoint result / notification log).
-   [ ] Keep the old deterministic trajectory assertions available or fold them in.

## Open questions (ask only if truly blocked)

-   Model slug for the simulator (default to a cheap one, e.g. `deepseek/deepseek-chat`,
    overridable by `SIM_MODEL` env). No new key needed — OpenRouter already configured.

## Status log

-   2026-06-28: branch `loop/policy-harness` cut; plan written; starting 7.5.
