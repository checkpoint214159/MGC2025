# Plan-Space Distance — ideation & research (TODO 12)

_A means to measure and regularize how far a generated recovery plan drifts from the expert
anchor, while still allowing the legitimate graduated progression of recovery. Ideation only —
this frames the problem, proposes a concrete metric, and sketches how it plugs into the app and
the policy harness. Written 2026-06-30._

## 1. The problem

A dietician/physiotherapist seeds the **initial plan** — the strong human-expert prior. From
there, plans are re-generated daily and nudged by **Externals** (the patient asks for more cream;
reports a bad knee day; a clinician note lands). Two things can then happen, and we want to treat
them very differently:

-   **Legitimate graduated progression.** Early plans are gentle (recovery just began); as the
    patient gains capacity we _expect_ more reps, longer walks, higher calories. Numeric growth
    along the recovery arc is good and should cost nothing.
-   **Semantic drift.** Across many generations the plan's _intention_ can wander away from the
    expert's: the modality mix shifts (mobility work quietly replaced by heavy resistance), tasks
    the clinician chose get dropped, or a single value jumps to something clinically implausible.

The user's framing names the exact tension:

> a. **Differentiation** from the original plan's intention and semantics _(we want to detect/limit this)_
> b. **Similarity** to the plan's numeric values — _but only up to an extremeness factor_ > _(we want to allow expected change, and only flag the unexpected-extreme)_

So we need a distance that is **large for semantic/compositional drift** and for
**unexpectedly-extreme numeric jumps**, yet **~0 for on-arc numeric progression**. Raw numeric
difference is the wrong primitive — it would punish exactly the growth we want.

## 2. What "plan space" actually is here

A `State` carries modules (`exercise`, `nutrition`, `sleep`, `symptoms`); each module's `plan` is
a list of **plan items**. Concretely (see `lib/state/schemas/*`):

-   **Exercise item**: `meta.name` (+ optional `precaution`), `meta.intensity ∈ {blue, orange, red}`,
    and `data.{resistance|mobility|aerobic|stability|…}` each with a numeric `{goal, unit, sets?}`.
-   **Nutrition item**: macro targets `{calories, protein, …}` each with a `goal`, plus a food checklist.
-   **Sleep**: a nightly duration `goal`. **Symptoms**: tracking only (`goal: 0`) — excluded from
    "plan intent" (it's measurement, not prescription).

So a plan item decomposes into three things a distance can read:

1. **Identity / intent** — what the task _is_ (name, module, category, precautions).
2. **Intensity class** — the blue/orange/red risk tag (a coarse ordinal the clinician set).
3. **Numeric target(s)** — the goals (reps, minutes, kcal, g).

**The reference point already exists.** The schema has an **anchor** state
(`State.isAnchor`, and daily states point to it via `anchorStateId`) — "the stable plan-of-record
carrying the X-day arc". The anchor is the natural stand-in for "the expert's initial plan / the
current plan-of-record". **Distance should be measured against the anchor**, not against
yesterday (yesterday already contains accumulated drift; the anchor is the intent to regularize
toward). Re-anchoring (below) is how deliberate clinician changes update the reference.

## 3. Decompose the distance into three orthogonal axes

`D(plan, anchor) = w_c · C  +  w_s · S  +  w_n · N`

Measured **per module**, then aggregated (weighted by module), so a nutrition blow-up doesn't
hide inside an unchanged exercise plan.

### C — Compositional distance (which tasks are present)

Set distance over task identities: `C = 1 − Jaccard(anchorTaskIds, planTaskIds)` (or a soft
version using the semantic matching below to pair renamed-but-equivalent tasks). Captures
**dropped/added** prescriptions — the clinician chose these tasks; silently removing "diaphragmatic
breathing" or adding "barbell squats" is real drift.

### S — Semantic distance (are the tasks the same _kind_ of thing)

For each anchor task, find its best match in the new plan and take `1 − cosine` of their
**embeddings** (embed `name + category + precaution`; the stack already embeds text for Pinecone
RAG — reuse that model). Aggregate as the mean best-match cost over anchor tasks, plus two cheap
distributional terms:

-   **Category mix drift**: Jensen–Shannon divergence between the anchor's and the plan's
    distribution over categories (mobility/strength/aerobic/…).
-   **Intensity mix drift**: JS divergence over the `{blue, orange, red}` tag distribution — a
    proxy for "is the overall risk/intensity profile the clinician set being preserved?"

S is what most directly answers (a): drift of _intent_, independent of the numbers.

### N — Numeric distance **relative to the expected envelope** (the crux of (b))

This is where graduated progression is handled. **Do not** compare raw goals. Instead compare the
plan's goal to an **expected envelope** derived from the anchor scaled along the recovery arc, and
only charge for deviation _outside_ the envelope.

## 4. The graduated-progression envelope

Mirror the existing recovery curve. `lib/engagement/arc.ts getExpectedRecovery` already models an
ease-out decay of _pain_ from baseline → 0 over the arc. Capacity is the dual: an ease-in growth
from the anchor's starting intensity toward a ceiling as recovery day advances.

For a matched task with anchor goal `g0` set at recovery day `d0`, define the expected goal at day
`d`:

```
expected(d) = g0 · capacity(d) / capacity(d0)
capacity(d) = 1 + GAIN · easeIn( clamp((d − d0)/(arcDays − d0), 0, 1) )
```

`GAIN` = how much total headroom the clinician expects over the arc (e.g. 1.5–3×, per-category or
per-module — tunable, ideally clinician-set). `easeIn` = a decelerating growth (e.g. `1−(1−t)²`),
so most progression is early-to-mid recovery, leveling near the end.

Then wrap it in a **tolerance band** `[expected/(1+β), expected·(1+β)]` (β ≈ 0.2–0.3): normal
day-to-day and Externals-driven wiggle inside the band costs **0**. Numeric distance is the
_signed excursion outside the band_:

```
dev = 0                         if goal ∈ band
    = (goal − upper)/upper      if goal > upper   (too aggressive)
    = (lower − goal)/lower      if goal < lower   (backsliding / under-progressing)
```

So: expected progression → inside band → `dev = 0`. A plan that jumps 5→60 min walking on day 3
→ far above the band → large `dev`. A plan that quietly regresses the patient → below band → also
flagged.

## 5. The "extremeness factor" (hinge + cap)

Per-task `dev` is passed through a **hinge** so small excursions stay cheap and large ones bite:

```
n(task) = 0                     if dev ≤ τ            (allowed drift)
        = ((dev − τ)/τ)²        if dev > τ            (superlinear past the threshold)
```

`N` for a module = a **soft-max / p95** over its tasks' `n`, not the mean — one clinically
implausible task should dominate (that's the "unexpected extreme" the spec calls out), not get
averaged away by many fine ones. `τ` is the extremeness knob.

## 6. How to _use_ the metric (regularization), cheapest → strongest

1. **In-prompt anchoring (regularizer).** Inject the anchor plan + the per-task expected envelope
   into the plan-gen context as an explicit soft constraint ("these are the clinician's targets
   scaled to today; stay within them unless an External clearly justifies a change, and explain
   any change"). Fits the existing cached prompt-layering in `modules.ts` at near-zero extra cost.
   Addresses drift at the source.
2. **Post-gen guardrail → clinician re-verification.** After generation compute `D`; if it exceeds
   a threshold, raise a **`Flag`** (the app already has a human-in-the-loop Flag system, e.g.
   `plan_drift` / `plan_extreme`) so the plan re-enters expert review before it becomes the plan
   the patient follows. This is the strongest fidelity guarantee and reuses existing machinery.
3. **Deterministic numeric clamp (safety net, no LLM).** Project any out-of-band goal back to the
   band boundary before the plan is served. Guarantees no clinically-extreme number ever reaches
   the patient even if the LLM ignores the prompt. Purely mechanical, unit-testable.
4. **Reject-and-retry.** If `D` is extreme, re-prompt once with the violation called out. Costs a
   generation; use sparingly (only above a hard ceiling).

Recommended: **1 + 3 always on** (cheap prompt steer + hard numeric safety), **2** when `D` crosses
the review threshold (semantic/compositional drift needs a human, not a clamp).

**Re-anchoring.** Deliberate expert change must not read as "drift forever". When a clinician
verifies/edits a plan (the S3 verification flow), promote it to the new anchor (`isAnchor`) — the
metric then regularizes toward the _updated_ intent. Externals that the clinician later blesses
thus move the reference; un-blessed drift keeps accumulating distance until reviewed.

## 7. Validating it with the policy harness

This is directly testable with the item-7/10.1 harness. Add Externals-injecting policies (once
the harness writes patient chat/notes — see the memory follow-up) and assert on `D` as an
observable, exactly like flags today:

-   **"reasonable Externals"** (patient asks for a bit more protein, an easier knee day): `D` stays
    under the review threshold; numeric axis ~0 (inside the envelope); no `plan_drift` flag.
-   **"scope-creep"** (over weeks, cardio quietly replaced by heavy lifting): `S`/`C` climb even
    though numbers look fine → `plan_drift` flag fires. This is the case raw-number checks miss.
-   **"extreme jump"** (a single 10× target): `N` spikes → clamp engages and/or `plan_extreme` flag.
-   **"healthy progression"** (standard-recovery policy): goals rise along the arc → all axes ~0
    (proves we don't punish the growth we want — the key correctness property).

Surface `D` and its `{C,S,N}` breakdown through the same observability path as the memory
snapshot (`/api/dev/state` op + `[plan-distance]` log), so `npm run harness:policies` can print a
drift column per policy.

## 8. Implementation sketch (for a future 12.x)

-   `lib/state/services/plan-distance.ts` — **pure**: `planDistance(anchorPlan, plan, {recoveryDay,
anchorDay, arcDays, weights, τ, β, gain})` → `{ D, composition, semantic, numeric, perTask[] }`.
    Numeric + compositional axes need no LLM/embeddings (unit-testable like `lib/engagement`).
-   `lib/state/services/plan-envelope.ts` — the `expected(d)`/`capacity(d)` curve (dual of
    `getExpectedRecovery`), + the clamp.
-   Semantic axis: a small `embedTasks()` helper reusing the RAG embedding model; cache embeddings
    on the plan item so it's computed once. Keep S optional/feature-flagged (it's the only part with
    a network/LLM dependency).
-   Hook: compute `D` at `save_state` (or a new `regularize_plan` node after `generate_module`);
    clamp there; raise a `Flag` when over threshold; log `[plan-distance] {json}`.
-   Config: weights/`τ`/`β`/`gain` in `GraphConfig` (the runtime-tunable table) so clinicians/admin
    can calibrate without a deploy.

**Phasing.** P0: numeric envelope + clamp + `[plan-distance]` log (deterministic, high safety,
no LLM). P1: compositional + semantic axes + `plan_drift` flag. P2: in-prompt anchoring +
re-anchoring on clinician verification. P3: harness policies that inject Externals and assert on `D`.

## 9. Open questions / decisions

-   **Curve shape & GAIN per category.** Strength vs aerobic vs mobility progress at different rates;
    is `GAIN` clinician-set per category, or learned from population data later? (Start: constant,
    admin-tunable.)
-   **Weights `w_c/w_s/w_n` and thresholds `τ, β`.** Calibrate against the harness + a few real
    clinician-reviewed trajectories; expose in `GraphConfig`.
-   **Anchor granularity.** One anchor per patient, or re-anchor per recovery phase? (Phase-anchors
    align with the episodic-memory phases and bound how far intent can travel within a phase.)
-   **Does semantic distance need embeddings at all for v1?** A cheaper proxy: category + intensity
    distribution divergence + task-id set overlap already catches most drift without a model. Add
    embeddings only if renamed-equivalent tasks prove to be a real false-positive source.
-   **Interaction with Externals provenance.** Should an External the patient _requested_ (logged in
    a thread) grant a larger tolerance band for the affected task than an unexplained change? (Ties
    into the raw-window/consolidation memory work.)

## 10. TL;DR

Measure each generated plan's distance **from the expert anchor**, decomposed into
**composition** (dropped/added tasks), **semantics** (intent/modality/intensity mix drift), and
**numeric-vs-expected-envelope** (deviation _outside_ a recovery-arc-scaled tolerance band, hinged
so only unexpected extremes bite). Regularize with a cheap in-prompt anchor + a deterministic
clamp, and escalate genuine drift to clinician re-verification via the existing Flag system.
Graduated progression costs nothing because it's subtracted out by the envelope; only drift in
_intent_ and _unexpected extremes_ accumulate distance. Validate it as an observable in the policy
harness.

## 11. Implemented (task c — P0+P1+P2 of §8)

-   `lib/state/services/plan-envelope.ts` — capacity curve (ease-in dual of getExpectedRecovery),
    `expectedEnvelope` (±β band, default 25%), `bandDeviation`, `clampToEnvelope`. Env-tunable
    (`PLAN_ENVELOPE_GAIN`/`_BETA`).
-   `lib/state/services/plan-distance.ts` — pure `planDistance(anchorTasks, planTasks, ctx)`:
    C (1−Jaccard w/ token-overlap+category matching — no embeddings in v1), S (JS divergence of
    category + intensity mixes), N (hinged band deviation, τ=0.15, p95-aggregated), D = 0.3C +
    0.3S + 0.4N. `clampBlueprintsToEnvelope` = the deterministic reject. 16 unit tests.
-   **In-prompt anchoring**: `assembleGenerationContext` appends a CLINICIAN ANCHOR PLAN block
    (per-task expected range for today) to the cached digest layer.
-   **Save-time guardrail** (`save_state`): measures RAW drift → `[plan-distance]` structured log,
    clamps out-of-envelope numerics before persisting, raises a deduped `plan_drift` Flag when
    D ≥ `PLAN_DRIFT_FLAG_THRESHOLD` (0.35; severity high at ≥0.6), and links the daily state to
    the anchor via `anchorStateId`.
-   Harness: `anchor=default` arg on the trajectory (sets the anchor post-reset), `distance` dev
    op, D in the `[[RESULT]]` line.

**Live verification** (2-day standard-policy run, default anchor): the generated plan tracked
the anchor's exact tasks — D=0.069, numeric axis 0 (on-envelope), 9/9 matched, 0 dropped, no
clamps, no flag. In-prompt anchoring demonstrably constrains generation; the clamp + flag
remain as the hard backstop.

**Known artifact (follow-up):** an anchor state whose symptoms progress is never logged
contributes a pain reading of 0 to the pain series (initialized-but-unlogged is
indistinguishable from a logged "no pain"), which can trip pain_stagnation as pain "rises"
from 0. Fix direction: derive the pain/compliance flag series from DailyMetric (written only
on actual logging) instead of raw state progress.

## 12. Mutation-scenario validation (TODO 12.2)

**Infrastructure.** `say` dev op (patient message → chat thread → raw window → next
generation's context — the "External" mutation channel); trajectory `events=` arg (scripted
[{day, message}] posted BEFORE that day's plan generates) + per-day `distance` tracking +
event-day module-summary printing (adaptation evidence); `scripts/harness/fixtures/
colostomy-sg.mjs` — Singaporean colostomy personas with lifestyle mutation features
(kopitiam-uncle, wet-market-auntie, polyclinic-haze); `npm run harness:distance` suite runs
each fixture (14-day spec default, `days=`/`only=` overridable) and prints the D trajectory
with event days marked.

**Observed (kopitiam-uncle, then polyclinic-haze).** The full loop verifies the working-doc
spec: event-day summaries read "adjusted for kopitiam breakfast request while maintaining
tissue repair priorities… targets held within clinical range" and "accommodating zi char
family dinner… scaled per progression curve" — the plan adapts semantically to the patient's
day while numerics stay anchored, and D stays far under the 0.35 flag threshold.

**Improvements folded back (the recursive part):**

1. **Adaptation evidence surfaced** — a flat D can mean "adapted within bounds" or "ignored
   the request"; the trajectory now prints event-day nutrition/exercise summaries so the suite
   shows _what_ changed, not just how far.
2. **C-axis sibling weighting** — added metrics on an already-matched plan item (fiber/sugar
   on the macro item) are metric enrichment, not a new prescription: half weight. Removed the
   constant ~0.18 noise floor; after the fix a quiet day reads D=0.045 and the haze-day indoor
   walking substitution reads D=0.069 — the metric now discriminates event-day adaptation from
   quiet days while both stay well inside the clinician's intent.

**Full 14-day runs (spec length).** kopitiam-uncle 29/29: D flat at 0.045 for 14 days —
value/summary-level nutrition adaptation, structure anchored. wet-market-auntie 29/29: the
richest trajectory — D 0.045 → 0.11 on the wet-market event (day 4) → 0.155 while her
errand-walking substitutions persist → 0.122 by day 14. A _persistent, legitimate_ semantic
substitution tracked and bounded (max 0.155, threshold 0.35) — the metric follows real
mutation pressure without flagging intent-preserving adaptation. polyclinic-haze aborted on
day 4: the OpenRouter key exhausted its credit limit mid-suite (infra, not metric — the 2-day
observation run of the same fixture was green, incl. the haze-day indoor substitution).
