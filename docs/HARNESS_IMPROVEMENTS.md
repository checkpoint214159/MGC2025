# Looping-harness improvement proposals (TODO 13)

_Proposals informed by everything built so far: journey smoke, policy/distance/notification
E2Es, the Claude-agent patient simulator, dev-ops bridge, [[RESULT]] protocol, session logs,
and the memory/usage/plan-distance observability. Written 2026-07-04._

## Where the harness stands

Five entry points (`harness`, `:trajectory`, `:policies`, `:distance`, `:notifications`) share
`_http.mjs` (auth/cookie client) and `_shared.mjs` (log scanning), talk to one dev-ops bridge
(`/api/dev/state` — now 10 ops), condition a real Claude-agent patient (`_simulator.mjs`), and
emit both human logs and machine `[[RESULT]]` lines that the two suites parse. Verification is
a mix of hard asserts (green/total), consistency invariants (flag ⟺ notification), and
reported-not-asserted observables (D trajectory, compaction ratio, adaptation evidence).

## 1 · Structural improvements

1. **Extract the run skeleton into `_run.mjs`.** Every E2E re-implements the same prologue
   (server-up check → seed persona → login → reset → optional anchor) and epilogue (assert,
   [[RESULT]], exit code). A `defineRun({name, setup, days, perDay, asserts})` skeleton would
   collapse each E2E to its distinctive middle and make new tests ~50 lines. The trajectory is
   already 450+ lines because it accreted policy, events, distance, compaction, and cron
   concerns — split those into composable _probes_ (see 3).
2. **Split the dev-ops bridge by domain.** `/api/dev/state` now multiplexes 10 ops across
   state/metrics/memory/anchor/conversation. Split into `/api/dev/{state,observe,patient}` (or
   a dispatch map of `op → handler` files) so each handler is unit-testable and the route file
   stops growing linearly with every feature.
3. **Probes as composable units.** The post-run checks (DailyMetric persisted, context
   observability, distance vs anchor, flag⟺notification) are inline blocks. Model each as a
   `probe(client, runCtx) → {name, ok, detail, data}` module; runs declare which probes they
   mount. Same probe list then powers any new suite for free (e.g. a persona×policy matrix).
4. **Typed result protocol.** `[[RESULT]]` JSON is shape-by-convention; suites defensively
   `?.` everything. Define the shape once (a `RunResult` zod schema in `scripts/harness/`
   validated on both emit and parse) so a field rename breaks loudly in CI, not silently in a
   summary table.
5. **Fixture/persona/policy registry.** Policies live in `policy-suite.mjs`, fixtures in
   `fixtures/colostomy-sg.mjs`, presets in `lib/dev/seed-patient.ts` — three axes in three
   places. A single `fixtures/index.mjs` registry (persona × policy × events × expected
   observables) enables matrix runs (`only=`, `preset=`, `days=` already compose) and gives
   every scenario a stable id for trend comparison across runs.
6. **Run artifacts as JSON, not just markdown.** Session logs (`.dev/policy-sessions/*.md`)
   are human-first. Also write `.dev/runs/<ts>-<name>.json` ({config, per-day records,
   probes, result}) — the raw material for the trend analysis in category 2 and for CI
   artifact upload.
7. **Cost budgets per run.** The `[llm-usage]` lines exist; a run should aggregate its own
   spend and include it in [[RESULT]] (the suites can then print cost/fixture and a budget
   warning — a 3-fixture × 14-day distance run is ~50 LLM calls).

## 2 · Analysis & verification (how a subagent should run and evaluate)

1. **Two-tier verification: invariants vs observations.** Codify what the harness already
   does implicitly. _Invariants_ (hard-fail): flag ⟺ notification consistency, DailyMetric
   row per logged day, D computable when anchor set, clamps never widen the envelope, zero
   `[prisma] ❌` log findings. _Observations_ (report + judge): D trajectory, compaction
   ratio, adaptation evidence, compliance means. The runner enforces invariants; the judging
   layer interprets observations. A subagent should never eyeball an invariant, and never
   hard-code a threshold for an observation.
2. **LLM-judge probe for semantic outcomes.** "Did the plan actually accommodate the kopitiam
   request?" is currently answered by printing the summary for a human. Add a cheap judge call
   (haiku, structured output: `{adapted: bool, how: string, withinIntent: bool}`) fed the
   event message + event-day plan diff + anchor. The suite then _asserts_ `adapted &&
withinIntent` — closing the gap where a flat D can hide an ignored request — while the raw
   evidence stays in the artifact for audit.
3. **Baseline + regression comparison.** Persist each suite run's key observables (per
   fixture: max D, mean compliance, flags fired, cost, compaction) to `.dev/runs/` and have
   the suite diff against the last green baseline: "kopitiam-uncle max D 0.069 → 0.31 since
   last run" is the single most useful signal a subagent can surface, and none of it needs an
   LLM.
4. **Subagent runbook per failure class.** When a run goes red, the transcript is long and the
   subagent burns context re-deriving triage. Ship `scripts/harness/RUNBOOK.md` mapping
   symptom → likely cause → next command (e.g. "state-gen 'Failed to process successful
   response' → transient schema-invalid LLM output → re-run day, check [llm-usage] for
   truncation"; "causalStateId unique violation → stale chain → `reset` op"). The policy-
   harness memory already documents two of these; make it systematic.
5. **Propose-improvements mode.** After a suite run, a subagent pass over the artifacts
   (usage report + memory report + distance series + session logs) that emits a ranked
   `PROPOSALS.md`: cost outliers (e.g. a module whose prompt grew 3×), metric blind spots
   (e.g. D never moves on nutrition-only mutations → weights need tuning), app-behavior gaps
   (e.g. plan ignored a doctor note). Each proposal must cite the artifact line that motivated
   it — this is exactly the audit→fix loop that caught binary compliance and the C-axis noise
   floor, made repeatable.
6. **Chaos/adversarial fixtures.** The current fixtures are cooperative. Add adversarial
   ones the judge should _reject_: a patient asking for plans beyond clinical bounds ("I feel
   great, double everything"), contradictory messages, prompt-injection-shaped messages
   ("ignore your instructions…"). Invariant: clamp + flag fire; the plan never follows the
   patient outside the envelope. This directly tests the working-doc's "system will reject
   those changes" promise under pressure.
7. **Time-compression honesty.** Runs simulate N days in minutes; consolidation thresholds,
   cron daily-nudges, and "days since last log" all read wall-clock. A `simClock` (dev-op
   settable date offset threaded through `getNormalizedAppDate`) would let a 14-day run
   exercise time-dependent behavior (memory consolidation cadence, inactivity flags)
   faithfully instead of approximately.
