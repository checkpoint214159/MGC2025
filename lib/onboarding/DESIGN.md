# Onboarding LangGraph Refactor

## Overview

The onboarding flow is refactored to use LangGraph with a PostgresSaver checkpointer. This replaces the scattered `useEffect`/`useMemo` logic across `app/(app)/patient/info/*.tsx` with a single, resumable state machine.

**Execution pattern**: Session-resumable with explicit interrupts (Bucket 2).

-   User interactions pause the graph (`interrupt()`)
-   Graph state is checkpointed to Postgres after each pause
-   Page refresh restores from checkpoint and resumes exactly where they left off
-   No lost context on network failure or tab close

---

## Architecture

### Graph Structure

```
[start]
  → load_biometrics_node
      (DB read; if missing, error)
  → generate_query_baseline_node
      (LLM call, saves to annotation)
  → collect_baseline_responses_node
      (interrupt: wait for slider responses from frontend)
  → generate_baseline_node
      (LLM call with user responses)
  → conversation_loop
      ├─→ ask_question_node
      │    (LLM generates next question; interrupt: wait for user answer)
      │    ↺ if answer doesn't terminate, loop back
      └─→ on termination: exit loop
  → generate_profile_node
      (LLM call: synthesize thread + biometrics → profile string)
  → save_profile_node
      (DB write: save profile to Prisma)
[end]
```

### Annotation State

```typescript
// lib/onboarding/graph/annotation.ts
OnboardingAnnotation = {
    userId: string,
    biometrics: Biometrics,
    queryBaseline: QueryBaseline | null,
    baselineResponses: Record<string, number>,
    baseline: Baseline | null,
    thread: Thread | null,
    currentQuestion: BaseQuestion | null,
    profile: string | null,
    error: string | null,
    step:
        "biometrics" |
        "query_baseline" |
        "baseline_responses" |
        "baseline" |
        "conversation" |
        "profile" |
        "done",
};
```

State flows through the graph. Each node reads what it needs and writes its outputs. The checkpointer persists the annotation after every `interrupt()`.

---

## Handling User Interruptions

### Example 1: Tab closes during LLM call

**Scenario**: User submits biometrics → `generate_query_baseline_node` is executing → user closes tab at 2/3 seconds into the LLM call.

**Before (current code)**: The fetch is aborted. `queryBaseline` is null when they return. `useEffect` re-runs `generateQueryBaselineAction` (accidental re-retry). If it fails twice, component enters undefined state.

**With LangGraph**: The checkpoint only commits after a node completes OR pauses. While `generate_query_baseline_node` is executing, the checkpoint still has the prior state (biometrics loaded). On resume, the node is re-executed from scratch with the same inputs. The retry is intentional, not accidental. If the node throws, the graph returns a `failed` state with error details.

---

### Example 2: Refresh mid-conversation (question 3 of 5)

**Scenario**: User answers question 3, question 4 is displayed. They hit F5.

**Before (current code)**: `useQuery` re-fetches, `currentQuestion` local state is lost. The component renders past-faded cards but no active input field. User is stuck.

**With LangGraph**: The checkpoint stores the full annotation, including `currentQuestion`. On page load, frontend calls `getOnboardingStateAction()` which restores the graph from the checkpoint. The annotation is returned with the current question intact. Frontend renders exactly where they left off.

---

### Example 3: Double-tap "Complete Baseline"

**Scenario**: On a slow connection, user taps the "Complete Baseline" button twice before the first LLM call finishes.

**Before (current code)**: Two parallel `generateBaselineAction()` calls fire. Both execute the LLM independently. Both save to the database (upsert). You get two LLM calls billed and potentially inconsistent data.

**With LangGraph**: The graph thread (identified by `userId`) is already executing `generate_baseline_node`. LangGraph's Pregel engine rejects or queues a second invocation of the same thread while one is in-flight. The second tap is a no-op at the graph level (can be caught on the frontend by disabling the button while the graph is busy).

---

## Checkpointer: PostgresSaver

### Setup

1. **Install the library**:

    ```bash
    npm install @langchain/langgraph-checkpoint-postgres
    ```

2. **Create the checkpointer singleton** (`lib/onboarding/graph/checkpointer.ts`):

    ```typescript
    import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

    let saver: PostgresSaver | null = null;

    export async function getOnboardingCheckpointer(): Promise<PostgresSaver> {
        if (!saver) {
            saver = new PostgresSaver({
                connectionString: process.env.DATABASE_URL,
            });
            await saver.setup(); // Creates checkpoint tables if they don't exist
        }
        return saver;
    }
    ```

3. **Pass it to graph.compile()**:
    ```typescript
    // lib/onboarding/graph/graph.ts
    const checkpointer = await getOnboardingCheckpointer();
    export const onboardingGraph = new StateGraph(OnboardingAnnotation)
        .addNode("load_biometrics", loadBiometricsNode)
        // ... nodes
        .compile({ checkpointer });
    ```

### What it does

-   Creates `checkpoint` and `checkpoint_writes` tables in your Postgres database (auto-created on first `setup()` call)
-   Persists the annotation after every `interrupt()` call
-   Keyed by `thread_id` (we use `userId` as the thread ID, so one checkpoint per user)
-   On `graph.invoke()` with an existing `thread_id`, LangGraph loads the checkpoint and resumes from the last interrupt

### Invocation with checkpointer

```typescript
// When starting fresh:
await onboardingGraph.invoke(
  { userId, biometrics: {...} },
  { configurable: { thread_id: userId } }
);

// On resume (page refresh), same thread_id automatically loads from checkpoint
await onboardingGraph.invoke(
  { /* minimal state, will be merged with checkpoint */ },
  { configurable: { thread_id: userId } }
);
```

---

## Control Flow: Resuming Mid-Graph

When the user refreshes the page while paused at an `interrupt()`:

1. Frontend calls `getOnboardingStateAction()` (new action)
2. Action invokes `onboardingGraph` with the `userId` as `thread_id`
3. LangGraph detects the checkpoint exists, loads the annotation
4. If the last execution ended at an `interrupt()`, graph is already paused — nothing runs
5. The annotation (including `currentQuestion`, `baselineResponses`, etc.) is returned to frontend
6. Frontend renders the exact state the user was in

If the checkpoint doesn't exist (first time onboarding), the graph starts fresh.

---

## Frontend Changes

### Before (scattered logic)

-   `page.tsx` computes `currentStep` via `useMemo` by inspecting fetched data
-   Each child component (`BaselinePage`, `QuestionPage`) manages its own effects and local state
-   `useQuery` fetches data once, but coordination is implicit and fragile

### After (single source of truth)

-   `getOnboardingStateAction()` returns the current graph state (including `step`, `currentQuestion`, `baselineResponses`, etc.)
-   `page.tsx` still uses `useQuery` (orthogonal to the graph; just caches the latest state)
-   Child components are simpler: they receive state as props and call backend actions to advance the graph
-   No more local state tracking of `currentQuestion`, `currentIndex`, etc. — the graph owns that

Example:

```typescript
// Before: useMemo computes step, useEffect builds currentQuestion
if (!onboardingData?.biometrics) return "BIOMETRICS";
if (!onboardingData?.baseline) return "BASELINES";
// ... etc

// After: step comes from the graph annotation
const { step, currentQuestion } = onboardingState;
// Just use step and currentQuestion directly
```

---

## Error Handling

Nodes can throw. On node failure:

-   The checkpoint is NOT updated (you stay at the prior state)
-   The graph returns a `failed` state (to be defined in the graph's return type)
-   Frontend can render a "Try again" button
-   Clicking "Try again" re-invokes the graph, which retries the failed node

This is safer than the current approach where a failed LLM call can leave you in an undefined state.

---

## Key Files

```
lib/onboarding/
├── DESIGN.md           ← You are here
├── annotation.ts       ← NEW: OnboardingAnnotation
├── service.ts          ← UPDATED: add getOnboardingStep(), getOnboardingState()
├── graph/
│   ├── checkpointer.ts ← NEW: getOnboardingCheckpointer()
│   ├── annotation.ts   ← (copied from root annotation.ts after creation)
│   ├── graph.ts        ← NEW: onboardingGraph with checkpointer
│   └── nodes/
│       ├── load_biometrics.ts    ← NEW
│       ├── query_baseline.ts     ← NEW (wraps generateQueryBaseline)
│       ├── baseline_responses.ts ← NEW (interrupt point)
│       ├── generate_baseline.ts  ← NEW (wraps generateBaseline)
│       ├── conversation.ts       ← NEW (loop + interrupt points)
│       ├── profile.ts            ← NEW (wraps generateUserProfile)
│       └── save_profile.ts       ← NEW
├── questioning.ts      ← unchanged
├── baselines.ts        ← unchanged
└── profile.ts          ← unchanged
```

---

## Testing the Flow

Manual testing checklist:

1. **Fresh onboarding**: Submit biometrics → answer baselines → answer conversation → verify profile saved
2. **Refresh mid-baseline**: Pause on a slider, refresh, verify slider state restored
3. **Refresh mid-conversation**: Pause on a question, refresh, verify question restored
4. **Double-tap button**: On slow connection, mash "Next" twice; verify only one LLM call executes
5. **Error recovery**: Simulate LLM failure, click "Try again", verify retry works

No automated tests (per your current approach), but these manual flows exercise the key interrupt and resume paths.
