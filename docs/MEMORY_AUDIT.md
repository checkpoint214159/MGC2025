# Memory & State-Generation Context — Audit (TODO 9.1)

_Verification of the current memory implementation before changing it (TODO item 9.1).
Findings here drive the 9.2 improvements. Written 2026-06-28._

## TL;DR — answering item 9's premise

> "Currently we only send in the previous day's plan and progress, is this correct?"

**Not quite — that premise is outdated.** Plan generation is _not_ fed only yesterday.
Each daily `generateModule` call already receives **three** context layers plus the previous
day's module:

1. **Compacted memory** (`renderMemoryForPrompt`) — stable clinical facts (semantic tier) +
   a phase-by-phase recovery narrative (episodic tier). Spans the **whole** recovery.
2. **Heuristic digest** (`buildHeuristicDigest`) — deterministic signals computed over the
   **entire** active-state history (adherence streak, 7/14-day adherence %, pain Δ vs baseline,
   pain-stagnation flag, recovery day/phase). Not just yesterday.
3. **Raw window** (`buildRawWindow`) — verbatim unconsolidated prose since the memory
   watermark (`consolidatedThrough`).
4. **Previous module** (`previousState.modules[key]`) — yesterday's plan JSON, for structural
   carry-forward. _This_ is the only literally "yesterday-only" piece.

So multi-timespan context already exists for the deterministic + narrative layers. What's
genuinely thin is (a) **structured** day-over-day plan/outcome history, and (b) an explicit
**mid-tier** (weekly/monthly) rollup between "this phase" (≈weeks) and "raw window" (≈hours).

## Architecture in place

### Memory tiers (DB: `PatientMemory`, 1:1 with patient)

| Tier      | Field                                             | Volatility                           | Written by                                                | Read by                         |
| --------- | ------------------------------------------------- | ------------------------------------ | --------------------------------------------------------- | ------------------------------- |
| Semantic  | `semantic: string`                                | stable, append-only, never rewritten | onboarding seed + consolidation (append, substring-dedup) | plan-gen, consolidation, report |
| Episodic  | `episodic: Json` = `[{phase, narrative, closed}]` | per-phase; closed phases frozen      | consolidation (current phase only)                        | plan-gen, consolidation, report |
| Watermark | `consolidatedThrough: DateTime`                   | advances each consolidation          | consolidation                                             | `buildRawWindow` boundary       |

`PatientMemoryVersion` is an append-only audit snapshot per consolidation (`trigger`:
`threshold` | `doctor_note`).

### The consolidation loop (piggybacked on daily state-gen)

`load_context` → router `routeAfterContext` → (maybe) `consolidate_memory` → `compile_external`
→ fan-out `generate_module ×4` → `save_state`.

-   **Trigger** (`shouldConsolidate`): raw window ≥ `CONSOLIDATION_CHAR_THRESHOLD` (4000 chars ≈
    1k tokens, env-overridable) **OR** a `doctor_note` thread arrived. Naturally ≤ once/day.
-   **Model proposes, code disposes**: one structured LLM call returns
    `{newSemanticFacts, currentPhaseNarrative}`; `applyConsolidation` (pure) appends facts,
    freezes earlier phases (`closed:true`), upserts the current phase narrative, advances the
    watermark. **Fail-safe**: on any error, prior memory + raw window are both kept.

### Timespan abstractions that exist

-   **Recovery phase** (`early` → `re-engagement` → `late`, from `getRecoveryPhase(recoveryDay)`):
    the coarse (~weeks) bucket the episodic narrative is organized by.
-   **Watermark split**: "consolidated memory" (everything before) vs "raw window" (after).
-   **`GraphConfig.contextWindowDays`** (default `1`): how many prior **raw states** to load.
-   Digest trends implicitly span 7d / 14d / full-history windows (in `buildHeuristicDigest`).

## Efficiency findings

### Working well

-   **Prompt-cache layering** (`modules.ts`): system + memory+digest + raw window each carry an
    Anthropic `ephemeral` cache breakpoint and are byte-identical across the 4 parallel module
    calls and stable across days → cached prefix read at ~0.1× after the first call.
-   **Compaction**: replacing a full-transcript blob with `memory + digest + small raw window`
    is the right shape and the documented cost win.
-   **Erosion guards in code, not the model** (`applyConsolidation`) — robust against bad gens.

### Inefficient / dead (fix candidates for 9.2)

1. **`state.transcripts` is computed but never consumed.** `load_context` builds a full
   `[ROLE]: content` transcript over **all threads, all messages**, then nothing reads it
   (dispatch uses memory/digest/rawWindow; `compile_external` re-fetches threads itself). Pure
   waste that grows with history. _(Confirmed by grep: only referenced in a doc-comment + the
   metadata log.)_
2. **`state.stateHistory` is loaded but never consumed.** When `contextWindowDays > 1`, the
   node does N sequential `getActiveState` round-trips (Neon HTTP = N round-trips), but only
   `previousState = historicalStates[0]` is used downstream. The N-day window is dead compute.
3. **Vestigial config**: `includeTrajectory` and `maxContextTokens` are read into
   `StateGenerationConfig` but **referenced nowhere** in `lib/state`. `smartFiltering` +
   `filterSignificantStates` + `computeStateChangeScore` only prune `historicalStates`, which
   is itself unused — so they have no effect on the prompt. Misleading surface area.
4. **Threads fetched twice per generation**: `load_context` (`include: threads.messages`) and
   again in `compile_external`. One fetch could be threaded through graph state.
5. **Raw window unbounded until consolidation**: fed verbatim to plan-gen **every day** until
   the 4000-char threshold trips. A chatty patient pays a growing daily prompt cost; a run of
   consolidation failures compounds it.

### Capability gaps (for item 9's "hierarchies of memory")

6. **No mid-tier (weekly/monthly) rollup.** Hierarchy today is semantic(∞) / episodic-per-phase
   (~weeks) / raw(~hours–days). Item 9 explicitly wants "across the sliding window, across the
   month." A weekly digest folded into a monthly summary is the missing rung.
7. **No structured plan→outcome memory.** Memory holds prose narrative + the digest holds
   metrics, but nothing records "we changed X in the plan → compliance/pain moved Y." That
   causal record is what would most improve _intelligent_ next-day planning.
8. **Phase-skip gap**: consolidation only writes the _current_ phase's narrative. If two phases
   elapse between consolidations, the intermediate phase never gets its own narrative.
9. **Consolidation only runs inside state-gen.** No state-gen for a while ⇒ no consolidation ⇒
   unbounded raw window next time.

## Proposed direction for 9.2 (to be confirmed as I implement)

Ranked by value/effort:

-   **A. Remove the dead context** (transcripts, stateHistory load when unused, vestigial config)
    — pure cleanup, lowers cost + confusion. _Low effort, high clarity._
-   **B. Add a mid-tier "rolling digest" memory** — a short weekly summary (and a monthly
    rollup) folded into `PatientMemory`, selectively injected into plan-gen. Directly answers
    item 9's hierarchy ask. _Medium effort._
-   **C. Structured plan→outcome trace** — persist a compact per-day `{adjustments, compliance,
pain}` record and surface a short "what we've tried & how it went" block to plan-gen.
    _Medium effort, highest planning-quality upside._
-   **D. Bound the raw window** (cap + force-consolidate) and de-dupe the thread fetch.

Item 10 then adds the **observability** (context sizes, memory contents/provenance, compression
ratio per consolidation) needed to _measure_ whether B/C actually improve compression +
plan quality, looped over the multi-policy e2e tests (10.1).

## Key files

-   Memory: `lib/memory/{schema,transforms,consolidate,service}.ts`
-   State-gen graph: `lib/state/graph/{graph,config,annotation}.ts`,
    `lib/state/graph/nodes/{context,consolidate,dispatch,external,module,save}.ts`
-   Prompt assembly: `lib/state/services/modules.ts`; digest: `lib/state/services/digest.ts`

## 9.2 — Implemented

-   **A. Removed dead context** ✅ — `state.transcripts` and `state.stateHistory` annotation
    fields deleted; `load_context` no longer builds the unused full-transcript string, does the
    N-day `getActiveState` loop, or runs `smartFiltering`/`filterSignificantStates`/
    `computeStateChangeScore`/`loadAllStateHistory` (all dead). `previousState` is now the most
    recent prior active state (derived from the history already fetched for the digest), which is
    robust to logging gaps — instead of strictly yesterday's exact date. Logging switched to
    `createLogger("state-gen")` and now reports context sizes (history/metrics/rolling/raw/memory
    chars) for item-10 observability.
-   **B. Rolling multi-window trends** ✅ — `lib/memory/rolling.ts` `buildRollingTrends(metrics,
asOf)` aggregates the persisted `DailyMetric` rows over sliding windows (7d, prior-7d for
    week-over-week direction, and 30d) into a compact labelled block, appended to the heuristic
    digest in `load_context`. Deterministic, 7 unit tests (`rolling.test.ts`). This is the mid-tier
    timespan the audit found missing — "across the sliding window / across the month."
-   **C. plan→outcome trace** — deferred (bigger: new persistence + design). Documented above.
-   **D. bound raw window + de-dupe thread fetch** — deferred; the `load_context`/`compile_external`
    double thread fetch remains. Documented above.

Net effect on the plan-gen prompt: same three cached layers, but the digest layer now carries
week-over-week + monthly trend direction, and the graph stopped computing two large unused
artifacts per generation.
