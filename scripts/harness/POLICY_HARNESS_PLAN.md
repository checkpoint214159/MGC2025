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

-   **The patient-simulator is a real Claude agent, spawned via the Claude Agent SDK**
    (`@anthropic-ai/claude-agent-sdk`) from inside `_simulator.mjs`. (Superseded the earlier
    OpenRouter-call design after the user clarified the patient should _be_ Claude.) The SDK
    spawns its own agent process and authenticates off the ambient Claude login — so it runs
    from a plain `npm run` with **no extra key** in this environment. Each day is a fresh
    single-turn agent conditioned on the policy + profile + running memory digest, keeping
    continuity without an ever-growing context and keeping the simulation **out of the main
    agent's context**. Default model `haiku` (cheap; override via `SIM_MODEL`).
    -   Why not the main agent's Agent tool: a `.mjs` script can't reach it (it only exists in
        the live conversation). The SDK is the way to get a real Claude patient runnable via npm.
    -   Why not OpenRouter: it isn't Anthropic-Messages-API compatible, and the patient should be
        Claude. (The OpenRouter version is preserved in git history if ever wanted.)
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

### 7 — Policy harness infrastructure ✅ DONE (committed)

-   [x] `scripts/harness/_simulator.mjs`: Claude-agent patient via Agent SDK,
        `decidePatientActions({policy, profile, memoryDigest, tasks})` → per-task values + pain.
-   [x] `scripts/harness/_policy-memory.mjs`: session markdown memory (create/append/readDigest).
-   [x] `scripts/harness/_plan.mjs`: extractTasks / buildUpdates / formatTaskLog.
-   [x] Arg parsing: `policy=` (+ `days=`, `complianceThreshold=`, `name=`, `model=`).
-   [x] Succinct per-task logging (`exercise:Ankle Pumps 6/20repetitions · … · pain 6/10`).
-   [x] `/api/dev/state` extended: `metrics`, `profile`, `reset` ops; compliance in `flags`.

### 8 — 14-day policy trajectory test (replaces e2e-trajectory) ✅ DONE

-   [x] `npm run harness:trajectory -- policy="..." [days= complianceThreshold= name= model=]`.
-   [x] After the run: persisted DailyMetric rows asserted; flags from the series.
-   [x] Asserts flag⟺notification consistency (no fixed prior) via the user-scoped cron.
-   [x] OpenRouter 14-day run: 24/24 green (pain_stagnation + low_compliance both fired+notified).
-   [x] SDK-patient 14-day run: both flags fired + both notifications sent; 13 DailyMetric rows.
        23/24 — the 1 miss was a transient app-side state-gen LLM error on day 1 ("Failed to
        process successful response"), which the harness tolerated (under the 3-fail abort) and
        continued past. Not a harness defect.

## Known limitations / follow-ups

-   App-side state generation occasionally returns schema-invalid LLM output ("Failed to process
    successful response"); over a 14-day run this trips ~1 day. The harness is resilient (aborts
    only after 3 consecutive failures). A retry on state-gen would make long runs fully green.
-   `force`-regenerating a state for a date that already has a chain collides on
    `State.causalStateId` (unique). The harness sidesteps this with the `reset` op; production
    never force-regens, so it's harness-only.

## Status log

-   2026-06-28: branch `loop/policy-harness`; 7.5 + 7 + 8 built. OpenRouter 14-day 24/24 green;
    patient then rewired to Claude Agent SDK (days=1 11/11; days=14 23/24, both flags fired).
    All of items 5, 6, 7, 7.5, 8 complete.
