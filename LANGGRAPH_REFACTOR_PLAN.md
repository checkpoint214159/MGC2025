# LangGraph Refactoring Plan

> **Target**: Refactor the MGC2025 recovery app's LLM orchestration to use LangGraph.js.
> **Scope split**: Step 1 = Onboarding pipeline. Step 2 = State generation pipeline.
> **Branch**: `agentic` (already checked out)

---

## Part 0: LangGraph Primer (Read This First)

LangGraph models a multi-step AI workflow as a **directed graph**:

```
[start] → nodeA → nodeB → [conditional branch] → nodeC or nodeD → [end]
```

Three things define any LangGraph app:

### 1. State

A plain TypeScript object that all nodes **read from and write to**. You declare it with `Annotation.Root`:

```typescript
import { Annotation } from "@langchain/langgraph";

const MyAnnotation = Annotation.Root({
  // Simple field — last write wins
  userId: Annotation<string>(),

  // Array field — new values are appended via reducer
  messages: Annotation<string[]>({
    reducer: (existing, incoming) => [...existing, ...incoming],
    default: () => [],
  }),
});

// Derive the TS type for use in function signatures:
type MyState = typeof MyAnnotation.State;
```

Every **node** function takes `MyState` as input and **returns a partial update** — only the keys it changed. LangGraph merges that update into the master state using the reducers.

### 2. Nodes

A node is any `async function(state: MyState): Promise<Partial<MyState>>`.

```typescript
// A node that calls an LLM and writes the result to state
async function generateReportNode(state: MyState) {
  const report = await callLLM(state.userId, state.messages);
  return { report }; // LangGraph merges this into state
}
```

### 3. Edges

Edges wire nodes together:

| Edge type | How to add | When to use |
|---|---|---|
| Fixed | `.addEdge("a", "b")` | Always go from A to B |
| Conditional | `.addConditionalEdges("a", routerFn)` | Decide at runtime — router returns node name |
| Fan-out (Send) | Router returns `Send[]` | Spawn N parallel workers from one node |

### 4. The `interrupt()` Function — Human-in-the-Loop

This is LangGraph's killer feature for this project. Inside any node body, you can call:

```typescript
import { interrupt } from "@langchain/langgraph";

async function askQuestionNode(state: MyState) {
  const question = await generateQuestion(state); // LLM call
  
  // ⏸️ Graph PAUSES here. The `question` payload is surfaced to the caller.
  // The function doesn't return yet — it waits.
  const userAnswer = interrupt({ question });
  
  // ▶️ Graph RESUMES when caller sends: graph.stream(new Command({ resume: "user's answer" }), config)
  // Now `userAnswer` = whatever the user typed.
  return { messages: [...state.messages, { role: "user", content: userAnswer }] };
}
```

The pause/resume works across HTTP requests because state is saved to a **checkpointer** (your PostgreSQL DB). The client sends the user's answer via a subsequent API call.

### 5. The Send API — Parallel Fan-Out

When you need to run multiple LLM calls in parallel (like generating exercise + nutrition modules), use `Send`:

```typescript
import { Send } from "@langchain/langgraph";

// This conditional edge function returns an array of Send objects
// LangGraph launches all of them in parallel
function dispatchModules(state: MyState) {
  return ['exercise', 'nutrition'].map(key => new Send('generate_module', { key }));
}
```

### 6. Graph Assembly

```typescript
import { StateGraph, MemorySaver } from "@langchain/langgraph";

const graph = new StateGraph(MyAnnotation)
  .addNode("nodeA", nodeAFn)
  .addNode("nodeB", nodeBFn)
  .addEdge("__start__", "nodeA")           // __start__ is the entry point
  .addConditionalEdges("nodeA", routerFn)  // routerFn returns "nodeB" or "__end__"
  .addEdge("nodeB", "__end__")
  .compile({ checkpointer: new MemorySaver() }); // checkpointer for persistence

// Run it:
const config = { configurable: { thread_id: "user-123" } }; // thread_id = persistence key
const result = await graph.invoke({ userId: "user-123" }, config);
```

---

## Part 1: Current Architecture — Full Mapping

Before changing anything, understand exactly what exists today.

### Onboarding: Current Call Chain

```
User lands on /patient/info
    │
    ▼
OnboardingFlow (page.tsx)
    │  useQuery(['onboarding']) → getOnBoardingAction() → getExistingOnboardingData()
    │  Resolves step: BIOMETRICS | BASELINES | CONVERSATION | DASHBOARD
    │
    ├─ Step BIOMETRICS
    │     SubmitBiometricsPage → updateBiometricsAction() → setBiometric()
    │
    ├─ Step BASELINES
    │     BaselinePage
    │         1. generateQueryBaselineAction() → generateQueryBaseline()
    │              └─ LLM call: "generate ICF axes for this surgery type"
    │              └─ Returns: QueryBaseline (slider questions)
    │         2. User fills sliders & submits
    │         3. generateBaselineAction() → generateBaseline()
    │              └─ LLM call: "convert slider values to WHO-ICF qualifiers"
    │              └─ Returns: Baseline (clinical assessment)
    │         4. setBaselineAction() → setBaseline() → saves to DB
    │
    └─ Step CONVERSATION
          QuestionPage.tsx (manages entire loop in React state)
              1. nextQuestion(null) called on mount
                  └─ getInitialLLMQuestion(biometrics, baseline)
                       └─ LLM call: "generate first holistic question"
              2. User submits answer
              3. nextQuestion(answer) called
                  a. updateThreadAction() → saves user message to DB
                  b. getNextLLMQuestion(biometrics, thread, baseline)
                       └─ LLM call: "generate next question or terminate"
                  c. if terminateQuestioning or >5 questions:
                      i.  generateUserProfileAction() → generateUserProfile()
                               └─ LLM call: "synthesize 150-200 word clinical profile"
                      ii. setProfileAction() → setProfile() → saves to DB
                      iii. update() (NextAuth session) + router.push('/')
                  d. else: saves question to thread, loops back to step 2
```

### State Generation: Current Call Chain

```
fetchStateAction(date) called by dashboard
    │
    ▼
generateNewState(userId, date)
    │
    ├─ prisma.user.findUnique() — load user + threads
    ├─ getActiveState(userId, yesterday) — get previous state (causal context)
    ├─ compileExternalAction(threads, profile)
    │     └─ compileExternal() → saves External to DB
    │
    └─ LLMGenerateState(yesterdayState, external, userId)
          │
          ├─ Build transcripts string from external.threadContext
          └─ Promise.all(['exercise', 'nutrition'].map(key =>
                generateModule(key, profile, transcripts, prevModuleData)
                    │
                    ├─ getModuleBlueprint(key, profile) → {schema, systemPrompt}
                    └─ generateWithRetry({model, schema, system, prompt})
                             └─ LLM call: "generate module blueprint"
            ))
    │
    └─ prisma.$transaction(...)
          └─ state.create({ modules: [...], progress: {...} })
```

---

## Step 1: Refactor Onboarding to LangGraph

### Why LangGraph Is a Perfect Fit Here

The current `QuestionPage.tsx` is a hand-coded state machine. It:

- Mixes UI and orchestration logic into one component
- Cannot survive a page refresh during conversation (state is in React `useState`)
- Is hard to extend (adding a new step requires editing the component directly)
- Has no retry/observability in the LLM call chain

LangGraph solves all of this:
- **Graph = orchestration logic** lives in `lib/onboarding/graph/`
- **Checkpointer = persistence** — graph state is saved to PostgreSQL, survives refreshes
- **interrupt() = proper human-in-the-loop** — clean pause/resume across HTTP requests
- **Nodes = testable units** — each step is an isolated function

### 1.1 File Structure to Create

```
lib/
  onboarding/
    graph/
      graph.ts          ← Graph assembly and export
      state.ts          ← OnboardingAnnotation (the shared state shape)
      edges.ts          ← Conditional routing functions
      checkpointer.ts   ← PostgreSQL checkpointer setup
      nodes/
        baselines.ts    ← Nodes: generate_baseline_questions, process_baseline_responses
        questioning.ts  ← Node: questioning (unified ask + wait for answer)
        profile.ts      ← Node: generate_profile

    # These existing files stay UNCHANGED — nodes call into them
    baselines.ts
    questioning.ts
    profile.ts
```

```
app/
  api/
    onboarding/
      route.ts   ← New API route: replaces direct server action calls in QuestionPage
```

### 1.2 State Design

**File: `lib/onboarding/graph/state.ts`**

```typescript
import { Annotation } from "@langchain/langgraph";
import { Biometrics } from "@/lib/user/schema";
import { Baseline, QueryBaseline } from "@/lib/user/baseline";
import { BaseQuestion } from "@/lib/llm/schemas/base";

// 💡 LangGraph: Annotation.Root defines the "shape" of the shared state object.
// Every node reads from and writes to an instance of this.
export const OnboardingAnnotation = Annotation.Root({
  // --- Inputs (provided when graph is first invoked) ---
  userId: Annotation<string>(),
  biometrics: Annotation<Biometrics>(),

  // --- Built up by baseline nodes ---
  // Annotation with no args = simple "last write wins" field
  queryBaseline: Annotation<QueryBaseline | null>({
    default: () => null,
    reducer: (_, incoming) => incoming, // always replace
  }),
  baseline: Annotation<Baseline | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),
  baselineUserResponses: Annotation<Record<string, number> | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),

  // --- Conversation state ---
  // Messages use an APPEND reducer — each node adds messages, never overwrites
  messages: Annotation<Array<{ role: "assistant" | "user"; content: string }>>({
    default: () => [],
    reducer: (existing, incoming) => [...existing, ...incoming],
  }),
  lastQuestion: Annotation<BaseQuestion | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),
  questionCount: Annotation<number>({
    default: () => 0,
    reducer: (current, increment) => current + increment, // adds to counter
  }),

  // --- Terminal output ---
  profile: Annotation<string | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),
});

// Export the TypeScript type for use in node function signatures
export type OnboardingState = typeof OnboardingAnnotation.State;
```

### 1.3 Nodes — Mapping from Current Functions

#### Baseline Nodes

**File: `lib/onboarding/graph/nodes/baselines.ts`**

| Current function | → | New node |
|---|---|---|
| `generateQueryBaseline()` in `lib/onboarding/baselines.ts` | → | `generateBaselineQuestionsNode` |
| `generateBaseline()` in `lib/onboarding/baselines.ts` | → | `processBaselineResponsesNode` |

```typescript
"use server";

import {
  generateQueryBaseline,
  generateBaseline,
} from "@/lib/onboarding/baselines"; // ← existing file, unchanged
import { interrupt } from "@langchain/langgraph";
import { OnboardingState } from "../state";

// Node: generate_baseline_questions
// Maps to: generateQueryBaseline() in lib/onboarding/baselines.ts
// What it does: calls the LLM to generate the slider questions (QueryBaseline),
//               then PAUSES to wait for the user to fill the sliders.
export async function generateBaselineQuestionsNode(state: OnboardingState) {
  // LLM call — same function as before, no changes needed
  const queryBaseline = await generateQueryBaseline(state.userId, state.biometrics);

  // 💡 LangGraph: interrupt() pauses the graph here and sends `queryBaseline`
  // to the caller (the API route). The graph won't proceed until the caller
  // sends: graph.stream(new Command({ resume: sliderResponses }), config)
  const baselineUserResponses: Record<string, number> = interrupt({ queryBaseline });

  // When resumed, execution continues here with the user's slider values
  return { queryBaseline, baselineUserResponses };
}

// Node: process_baseline_responses
// Maps to: generateBaseline() in lib/onboarding/baselines.ts
// What it does: converts slider responses to a clinical ICF Baseline object.
export async function processBaselineResponsesNode(state: OnboardingState) {
  const baseline = await generateBaseline(
    state.biometrics,
    state.baselineUserResponses!, // collected via interrupt above
    state.queryBaseline!
  );
  return { baseline };
}
```

#### Questioning Node

**File: `lib/onboarding/graph/nodes/questioning.ts`**

| Current function | → | New node |
|---|---|---|
| `getInitialLLMQuestion()` in `lib/onboarding/questioning.ts` | → | Merged into `questioningNode` (first-question branch) |
| `getNextLLMQuestion()` in `lib/onboarding/questioning.ts` | → | Merged into `questioningNode` (subsequent branch) |
| "loop or terminate" logic in `QuestionPage.tsx` | → | Moved to conditional edge in `graph.ts` |
| `updateThreadAction()` calls in `QuestionPage.tsx` | → | Thread built from `state.messages` (no separate DB writes mid-loop) |

```typescript
"use server";

import {
  getInitialLLMQuestion,
  getNextLLMQuestion,
} from "@/lib/onboarding/questioning"; // ← existing file, unchanged
import { interrupt } from "@langchain/langgraph";
import { Thread } from "@/lib/external/schemas/thread";
import { OnboardingState } from "../state";

// Node: questioning
// This single node replaces the entire `nextQuestion()` function in QuestionPage.tsx.
// It loops: LLM generates a question → graph pauses → user answers → graph resumes.
// The conditional edge (in graph.ts) decides whether to loop back or proceed to profile.
export async function questioningNode(state: OnboardingState) {
  const isFirstQuestion = state.messages.filter(m => m.role === "assistant").length === 0;

  // Reconstruct a Thread-like object from messages in state
  // This replaces the live DB thread that was threaded through QuestionPage
  const threadContext: Thread = {
    id: `onboarding-${state.userId}`, // synthetic ID — real thread saved at the end
    messages: state.messages.map(m => ({
      role: m.role,
      content: m.content,
      threadId: `onboarding-${state.userId}`,
      threadType: "onboarding",
    })),
  };

  // LLM call — same functions as before, no changes needed
  const question = isFirstQuestion
    ? await getInitialLLMQuestion(state.biometrics, state.baseline!)
    : await getNextLLMQuestion(state.biometrics, threadContext, state.baseline!);

  // 💡 LangGraph: interrupt() pauses the graph and sends the question to the client.
  // The client renders the question UI (QuestionCard), user submits an answer,
  // then the API route calls: graph.stream(new Command({ resume: userAnswer }), config)
  const userAnswer: string = interrupt({ question });

  // Execution resumes here with userAnswer
  return {
    lastQuestion: question,
    questionCount: 1, // reducer adds 1 to current count
    messages: [
      { role: "assistant" as const, content: question.questionText },
      { role: "user" as const, content: userAnswer },
    ],
  };
}
```

#### Profile Node

**File: `lib/onboarding/graph/nodes/profile.ts`**

| Current function | → | New node |
|---|---|---|
| `generateUserProfile()` in `lib/onboarding/profile.ts` | → | `generateProfileNode` |
| `setProfileAction()` call in `QuestionPage.tsx` | → | Handled here, or in a separate `save_profile` node |

```typescript
"use server";

import { generateUserProfile } from "@/lib/onboarding/profile"; // ← unchanged
import { setProfile } from "@/lib/user/service";
import { updateThread } from "@/lib/user/service";
import { OnboardingState } from "../state";

// Node: generate_profile
// Maps to: generateUserProfileAction() + setProfileAction() in QuestionPage.tsx
// What it does: synthesizes the full conversation into a clinical profile, saves it.
export async function generateProfileNode(state: OnboardingState) {
  // Reconstruct Thread from state.messages (same shape expected by generateUserProfile)
  const thread = {
    id: `onboarding-${state.userId}`,
    messages: state.messages.map(m => ({
      role: m.role,
      content: m.content,
      threadId: `onboarding-${state.userId}`,
      threadType: "onboarding",
    })),
  };

  // LLM call — same function as before
  const profile = await generateUserProfile({
    thread: thread as any,
    biometrics: state.biometrics,
    baseline: state.baseline!,
  });

  // Persist to DB (replacing setProfileAction in QuestionPage.tsx)
  await setProfile(state.userId, profile);

  // Also persist the conversation thread (replacing the in-conversation updateThreadAction calls)
  await updateThread(state.userId, null, "onboarding", state.messages as any);

  return { profile };
}
```

### 1.4 Conditional Edge — Replacing the Loop Logic in QuestionPage.tsx

**File: `lib/onboarding/graph/edges.ts`**

The current termination check is buried in `QuestionPage.tsx`:

```typescript
// OLD (in QuestionPage.tsx):
if (nextQn.inputType === 'terminateQuestioning' || numQuestions > 5) {
  // ... generate profile and redirect
}
```

In LangGraph, this becomes a **routing function** returned from a conditional edge:

```typescript
import { OnboardingState } from "./state";

// 💡 LangGraph: A conditional edge function reads from state and returns
// the NAME of the next node to go to. LangGraph calls this after each
// invocation of the "questioning" node.
export function shouldContinueQuestioning(
  state: OnboardingState
): "questioning" | "generate_profile" {
  const hasTerminated = state.lastQuestion?.inputType === "terminateQuestioning";
  const reachedLimit = state.questionCount >= 5;

  if (hasTerminated || reachedLimit) {
    return "generate_profile";
  }
  return "questioning"; // loop back — LangGraph will re-enter the questioning node
}
```

### 1.5 Checkpointer Setup

The checkpointer is what makes `interrupt()` work across HTTP requests. It serializes and saves the full graph state to a database between turns.

**File: `lib/onboarding/graph/checkpointer.ts`**

```typescript
// For production: install @langchain/langgraph-checkpoint-postgres
// npm install @langchain/langgraph-checkpoint-postgres
// Then use:
//
// import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
// export const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
// await checkpointer.setup(); // run once (creates 3 checkpoint tables in Postgres)

// For development: use in-memory checkpointer (loses state on server restart)
import { MemorySaver } from "@langchain/langgraph";
export const checkpointer = new MemorySaver();

// ⚠️ Switch to PostgresSaver before deploying.
// The checkpointer tables (checkpoints, checkpoint_blobs, checkpoint_writes) are
// separate from your Prisma schema — PostgresSaver creates them itself.
```

### 1.6 Graph Assembly

**File: `lib/onboarding/graph/graph.ts`**

```typescript
import { StateGraph } from "@langchain/langgraph";
import { OnboardingAnnotation } from "./state";
import { generateBaselineQuestionsNode, processBaselineResponsesNode } from "./nodes/baselines";
import { questioningNode } from "./nodes/questioning";
import { generateProfileNode } from "./nodes/profile";
import { shouldContinueQuestioning } from "./edges";
import { checkpointer } from "./checkpointer";

// 💡 LangGraph: StateGraph is the container. We give it OnboardingAnnotation
// so it knows the shape of state and what reducers to apply for each key.
export const onboardingGraph = new StateGraph(OnboardingAnnotation)

  // --- Register nodes ---
  // .addNode(name, function) — "name" is what you reference in edges
  .addNode("generate_baseline_questions", generateBaselineQuestionsNode)
  .addNode("process_baseline_responses", processBaselineResponsesNode)
  .addNode("questioning", questioningNode)
  .addNode("generate_profile", generateProfileNode)

  // --- Wire up fixed edges ---
  // "__start__" is LangGraph's reserved name for the entry point
  .addEdge("__start__", "generate_baseline_questions")
  // After baseline questions are RESUMED with slider data, process them:
  .addEdge("generate_baseline_questions", "process_baseline_responses")
  // After baseline is computed, start the conversation:
  .addEdge("process_baseline_responses", "questioning")
  // Profile generation is terminal — go to "__end__" after:
  .addEdge("generate_profile", "__end__")

  // --- Wire up the conditional loop ---
  // After each invocation of "questioning", call shouldContinueQuestioning(state).
  // If it returns "questioning" → loop back. If it returns "generate_profile" → exit loop.
  .addConditionalEdges("questioning", shouldContinueQuestioning)

  // --- Compile with checkpointer ---
  // The checkpointer is what persists state between interrupt/resume cycles.
  // thread_id in the config is the persistence key (we use userId + "onboarding").
  .compile({ checkpointer });
```

Visual graph:

```
[__start__]
     │
     ▼
generate_baseline_questions ──(interrupt: show sliders)──► [paused]
     │                              ◄── resume with { sliderValues }
     ▼
process_baseline_responses
     │
     ▼
questioning ──────────────(interrupt: show question)──► [paused]
     │   ▲                        ◄── resume with { answer }
     │   │ (loop if < 5 questions)
     ▼   │
 shouldContinueQuestioning()
     │
     └─ generate_profile
               │
          [__end__]
```

### 1.7 New API Route — The Client-Facing Interface

This replaces the scattered direct calls to `getInitialLLMQuestion`, `getNextLLMQuestion`, and action functions in `QuestionPage.tsx`.

**File: `app/api/onboarding/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Command, isGraphInterrupt } from "@langchain/langgraph";
import { onboardingGraph } from "@/lib/onboarding/graph/graph";
import { Biometrics } from "@/lib/user/schema";

// The thread_id is unique per user's onboarding session.
// Using userId ensures the same graph is resumed on every request.
function getConfig(userId: string) {
  return { configurable: { thread_id: `onboarding-${userId}` } };
}

// POST /api/onboarding
// Two behaviors based on request body:
//
// 1. { action: "start", biometrics: {...} }
//    → Starts the graph from the beginning (or resumes if already started).
//
// 2. { action: "resume", resume: <value> }  
//    → Resumes the graph after an interrupt with the provided value.
//    `resume` could be: slider responses (Record<string,number>) or a question answer (string).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const body = await req.json();
  const config = getConfig(userId);

  let result;
  try {
    if (body.action === "start") {
      // First call — initialize the graph with input data
      result = await onboardingGraph.invoke(
        { userId, biometrics: body.biometrics as Biometrics },
        config
      );
    } else if (body.action === "resume") {
      // Subsequent call — resume the paused graph with user input.
      // 💡 LangGraph: Command({ resume: value }) is passed instead of a state
      // update. LangGraph routes it to the interrupted node's `interrupt()` call.
      result = await onboardingGraph.invoke(
        new Command({ resume: body.resume }),
        config
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e: any) {
    // isGraphInterrupt checks if the graph stopped due to an interrupt() call
    // (as opposed to an actual error). This happens when a node is paused.
    if (isGraphInterrupt(e?.interrupts)) {
      const interrupt = e.interrupts[0];
      return NextResponse.json({ status: "interrupted", payload: interrupt.value });
    }
    console.error("Onboarding graph error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // If we reach here, the graph completed without interrupting (i.e., profile was generated)
  return NextResponse.json({ status: "complete", profile: result.profile });
}
```

> **Note on invoke vs stream**: The route above uses `invoke()` which runs until interrupt or completion. An alternative is `stream()` which yields token-by-token updates — useful if you want loading indicators while `.invoke()` is running.

### 1.8 Simplifying QuestionPage.tsx

After the API route is wired up, `QuestionPage.tsx` is reduced to a thin client that calls the API:

**OLD `QuestionPage.tsx` (simplified to show what's removed):**
- ❌ `getInitialLLMQuestion()` direct call (bypasses Next.js server boundary)
- ❌ `getNextLLMQuestion()` direct call
- ❌ `updateThreadAction()` every question turn
- ❌ `generateUserProfileAction()` on termination
- ❌ `setProfileAction()` on termination
- ❌ Manual `numQuestions > 5` check
- ❌ `useState` for `currentQuestion`, `activeThread`

**NEW `QuestionPage.tsx` (what remains):**

```typescript
"use client";

import { useState } from "react";
import { DynamicQuestionCard, ThinkingCard } from "./QuestionCard";
import { BaseQuestion } from "@/lib/llm/schemas/base";

interface QuestionPageProps {
  biometrics: Biometrics;
  baseline: Baseline;
}

export function QuestionPage({ biometrics, baseline }: QuestionPageProps) {
  const [currentQuestion, setCurrentQuestion] = useState<BaseQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // On mount: start the graph (or resume it if already in progress)
  useEffect(() => {
    startOrResume();
  }, []);

  async function startOrResume() {
    setIsLoading(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", biometrics }),
    });
    const data = await res.json();
    if (data.status === "interrupted") {
      setCurrentQuestion(data.payload.question); // graph paused at questioning node
    }
    setIsLoading(false);
  }

  async function submitAnswer(answer: string) {
    setIsLoading(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resume", resume: answer }),
    });
    const data = await res.json();

    if (data.status === "interrupted") {
      setCurrentQuestion(data.payload.question); // next question
    } else if (data.status === "complete") {
      router.push("/"); // onboarding done
    }
    setIsLoading(false);
  }

  if (isLoading) return <ThinkingCard />;
  if (!currentQuestion) return null;
  return <DynamicQuestionCard question={currentQuestion} onSubmit={submitAnswer} />;
}
```

The component went from ~120 lines of complex orchestration logic to ~50 lines of simple API calls.

### 1.9 Baseline Flow (BaselinePage.tsx)

`BaselinePage.tsx` currently calls `generateQueryBaselineAction()` then `generateBaselineAction()` directly. Under the new model, this is folded into the graph through the `generate_baseline_questions` node's `interrupt()`.

Instead of two separate action calls from the component, the flow becomes:

1. Component calls `POST /api/onboarding` with `{ action: "start", biometrics }`
2. Graph runs `generate_baseline_questions` → LLM generates `queryBaseline` → `interrupt({ queryBaseline })`
3. API returns `{ status: "interrupted", payload: { queryBaseline } }`
4. Component renders sliders from `payload.queryBaseline`
5. User fills & submits sliders → component calls `POST /api/onboarding` with `{ action: "resume", resume: sliderValues }`
6. Graph resumes → runs `process_baseline_responses` → runs `questioning` → next interrupt

This makes the whole onboarding flow a single graph session from start to finish.

### 1.10 What Files Change — Full Impact List

| File | Change |
|---|---|
| `lib/onboarding/baselines.ts` | **No change** — functions used as-is inside nodes |
| `lib/onboarding/questioning.ts` | **No change** — functions used as-is inside nodes |
| `lib/onboarding/profile.ts` | **No change** — function used as-is inside node |
| `lib/onboarding/graph/` | **Create** (entire new directory) |
| `app/api/onboarding/route.ts` | **Create** (new API route) |
| `app/(app)/patient/info/QuestionPage.tsx` | **Simplify** — remove state machine, use API |
| `app/(app)/patient/info/BaselinePage.tsx` | **Simplify** — remove direct action calls, use API |
| `app/(app)/patient/info/page.tsx` | **Minor** — step detection may change |
| `lib/actions.ts` | **Mostly intact** — `generateQueryBaselineAction`, `generateBaselineAction`, etc. can be deprecated gradually |
| `lib/user/service.ts` | **No change** |

### 1.11 Installation & Setup

```bash
npm install @langchain/langgraph-checkpoint-postgres
```

For the checkpointer, run this **once** to create the checkpoint tables in PostgreSQL (separate from Prisma migrations, managed by LangGraph itself):

```typescript
// Run once in a setup script or on first boot:
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
await checkpointer.setup();
```

---

## Step 2: Refactor State Generation to LangGraph

### Why LangGraph Fits Here

The current `generateNewState()` is a flat sequence of awaits with a `Promise.all` branch. The issues:

- No retry logic if one module fails (all modules are retried via `generateWithRetry`, but at the module level, not the orchestration level)
- No observability into which step failed
- `compileExternal()` is called both as a standalone action and within `generateNewState()` — confusing

LangGraph gives you:
- **Clear DAG** — each step is a named, inspectable node
- **Map-Reduce fan-out** — `Send` replaces `Promise.all` with proper LangGraph-native parallelism
- **Dynamic module list** — the set of modules to generate can vary per surgery type without changing the graph structure

### 2.1 File Structure to Create

```
lib/
  state/
    graph/
      graph.ts          ← Graph assembly and export
      state.ts          ← StateGenerationAnnotation
      nodes/
        context.ts      ← Node: load_context
        external.ts     ← Node: compile_external
        dispatch.ts     ← Conditional edge fn using Send (fan-out)
        module.ts       ← Node: generate_module (called N times in parallel)
        save.ts         ← Node: save_state

    # These existing files stay UNCHANGED
    service.ts
    services/
      full.ts
      modules.ts
      mapping.ts
```

### 2.2 State Design

**File: `lib/state/graph/state.ts`**

```typescript
import { Annotation } from "@langchain/langgraph";
import { State } from "@/lib/state/schemas/state";
import { External } from "@/lib/external/schemas/external";

export const StateGenerationAnnotation = Annotation.Root({
  // --- Inputs ---
  userId: Annotation<string>(),
  date: Annotation<Date>(),

  // --- Loaded from DB ---
  previousState: Annotation<State | null>({
    default: () => null,
    reducer: (_, b) => b,
  }),
  transcripts: Annotation<string>({
    default: () => "",
    reducer: (_, b) => b,
  }),

  // --- Compiled external context ---
  external: Annotation<External | null>({
    default: () => null,
    reducer: (_, b) => b,
  }),

  // --- Per-module outputs (accumulated via Map-Reduce)  ---
  // 💡 LangGraph: The merge reducer combines each module's result object.
  // When generate_module runs for 'exercise', it returns { generatedModules: { exercise: {...} } }
  // When it runs for 'nutrition', it returns { generatedModules: { nutrition: {...} } }
  // The reducer merges them: { exercise: {...}, nutrition: {...} }
  generatedModules: Annotation<Record<string, any>>({
    default: () => ({}),
    reducer: (existing, incoming) => ({ ...existing, ...incoming }),
  }),

  // --- Final saved state ---
  savedState: Annotation<State | null>({
    default: () => null,
    reducer: (_, b) => b,
  }),
});

export type StateGenerationState = typeof StateGenerationAnnotation.State;
```

### 2.3 Nodes — Mapping from Current Functions

#### Context Node

**File: `lib/state/graph/nodes/context.ts`**

| Current code | → | New node |
|---|---|---|
| `prisma.user.findUnique()` in `generateNewState()` | → | `loadContextNode` |
| `getActiveState(userId, yesterday)` in `generateNewState()` | → | `loadContextNode` |

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveState } from "@/lib/state/service"; // existing function, unchanged
import { StateGenerationState } from "../state";

// Node: load_context
// Maps to: the first two awaits in generateNewState() in lib/state/service.ts
export async function loadContextNode(state: StateGenerationState) {
  const yesterday = new Date(state.date);
  yesterday.setDate(yesterday.getDate() - 1);

  const [user, previousState] = await Promise.all([
    prisma.user.findUnique({
      where: { id: state.userId },
      include: { threads: { include: { messages: true } } },
    }),
    getActiveState(state.userId, yesterday),
  ]);

  if (!user) throw new Error(`User ${state.userId} not found`);

  // Build transcript string here (moved from LLMGenerateState in full.ts)
  const threadContext = user.threads;
  const transcripts = threadContext
    .map((thread: any) => {
      const msgs = thread.messages
        ?.map((m: any) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join("\n") || "No messages";
      return `### Thread: ${thread.title || "General"}\n${msgs}`;
    })
    .join("\n\n---\n\n");

  return { previousState, transcripts };
}
```

#### External Node

**File: `lib/state/graph/nodes/external.ts`**

| Current code | → | New node |
|---|---|---|
| `compileExternalAction(threads, profile)` in `generateNewState()` | → | `compileExternalNode` |
| `compileExternal()` in `lib/external/service.ts` | → | Called inside node, unchanged |

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { compileExternal } from "@/lib/external/service"; // existing function, unchanged
import { ExternalSchema } from "@/lib/external/schemas/external";
import { StateGenerationState } from "../state";

// Node: compile_external
// Maps to: compileExternalAction() call in generateNewState() in lib/state/service.ts
export async function compileExternalNode(state: StateGenerationState) {
  const user = await prisma.user.findUnique({
    where: { id: state.userId },
    include: { threads: { include: { messages: true } } },
  });
  if (!user) throw new Error("User not found");

  const safeProfile = (user.profile as string) ?? "No profile data provided";
  const external = await compileExternal(state.userId, user.threads as any, safeProfile);

  return { external };
}
```

#### Module Dispatch (Fan-Out)

**File: `lib/state/graph/nodes/dispatch.ts`**

| Current code | → | New structure |
|---|---|---|
| `const modulesToGenerate = ['exercise', 'nutrition']` in `full.ts` | → | `getModuleKeysForState()` (can be dynamic) |
| `Promise.all(modulesToGenerate.map(...))` in `full.ts` | → | `dispatchModules()` returning `Send[]` |

```typescript
import { Send } from "@langchain/langgraph";
import { StateGenerationState } from "../state";

// This determines which modules to generate.
// In the future, you could select different modules based on surgery type,
// day of recovery, or patient progress.
function getModuleKeysForState(state: StateGenerationState): string[] {
  // Could be dynamic: e.g., add 'wound_care' on days 1-3, 'physiotherapy' later
  return ["exercise", "nutrition"];
}

// 💡 LangGraph: This function is used as a conditional edge from compile_external.
// Instead of returning a node name string, it returns an ARRAY of Send objects.
// LangGraph launches one invocation of "generate_module" per Send — in parallel.
// Each Send carries its own input payload (not the full graph state).
export function dispatchModules(state: StateGenerationState): Send[] {
  const moduleKeys = getModuleKeysForState(state);

  return moduleKeys.map(
    (moduleKey) =>
      new Send("generate_module", {
        // 💡 Each Send gets its own isolated input — like calling a function with these args.
        // The generate_module node receives this as its "state" (mini-state).
        moduleKey,
        profile: state.external!.profile,
        transcripts: state.transcripts,
        previousModule:
          state.previousState?.modules?.find((m) => m.type === moduleKey) ?? null,
      })
  );
}
```

#### Module Generator Node

**File: `lib/state/graph/nodes/module.ts`**

| Current code | → | New node |
|---|---|---|
| `generateModule(key, profile, transcripts, prevState)` in `services/modules.ts` | → | `generateModuleNode` |

```typescript
"use server";

import { generateModule } from "@/lib/state/services/modules"; // existing function, unchanged
import { StateGenerationState } from "../state";

// The "mini-state" type for each parallel Send invocation
interface ModuleInput {
  moduleKey: string;
  profile: string;
  transcripts: string;
  previousModule: any | null;
}

// Node: generate_module
// Maps to: generateModule() in lib/state/services/modules.ts
// This node is called ONCE PER MODULE, in parallel, by the Send fan-out.
// Each call writes { generatedModules: { [moduleKey]: blueprint } } to state.
// The reducer on generatedModules merges all modules together.
export async function generateModuleNode(input: ModuleInput): Promise<Partial<StateGenerationState>> {
  const result = await generateModule(
    input.moduleKey,
    input.profile,
    input.transcripts,
    input.previousModule
  );

  // 💡 LangGraph: The generatedModules reducer merges each module's result:
  //   exercise invocation writes:  { generatedModules: { exercise: {...} } }
  //   nutrition invocation writes: { generatedModules: { nutrition: {...} } }
  //   After both complete:         { generatedModules: { exercise: {...}, nutrition: {...} } }
  return { generatedModules: { [input.moduleKey]: result } };
}
```

#### Save State Node

**File: `lib/state/graph/nodes/save.ts`**

| Current code | → | New node |
|---|---|---|
| `prisma.$transaction(...)` at end of `generateNewState()` | → | `saveStateNode` |
| `createInitialProgress()`, `createInitialChecklistState()` | → | Called inside node, unchanged |

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { StateSchema } from "@/lib/state/schemas/state";
import { createInitialProgress, createInitialChecklistState } from "@/lib/state/converters";
import { StateGenerationState } from "../state";

// Node: save_state
// Maps to: the prisma.$transaction block at the end of generateNewState()
// Called after ALL generate_module invocations have completed (fan-in).
export async function saveStateNode(state: StateGenerationState) {
  const savedState = await prisma.$transaction(async (tx) => {
    // Deactivate any existing state for today
    await tx.state.updateMany({
      where: { userId: state.userId, dateCreated: state.date, isActive: true },
      data: { isActive: false },
    });

    return tx.state.create({
      data: {
        userId: state.userId,
        dateCreated: state.date,
        isActive: true,
        causalStateId: state.previousState?.id ?? null,
        causalXId: state.external!.id,
        modules: {
          create: Object.entries(state.generatedModules).map(([type, blueprint]: [string, any]) => ({
            type,
            summary: blueprint.summary,
            plan: blueprint.plan,
            checklists: blueprint.checklists || [],
            progress: {
              create: {
                trackables: createInitialProgress(blueprint.plan),
                checklistState: blueprint.checklists
                  ? createInitialChecklistState(blueprint.checklists)
                  : {},
              },
            },
          })),
        },
      },
      include: { modules: { include: { progress: true } } },
    });
  });

  return { savedState: StateSchema.parse(savedState) };
}
```

### 2.4 Graph Assembly

**File: `lib/state/graph/graph.ts`**

```typescript
import { StateGraph } from "@langchain/langgraph";
import { StateGenerationAnnotation } from "./state";
import { loadContextNode } from "./nodes/context";
import { compileExternalNode } from "./nodes/external";
import { dispatchModules } from "./nodes/dispatch";
import { generateModuleNode } from "./nodes/module";
import { saveStateNode } from "./nodes/save";

// 💡 LangGraph: No checkpointer needed here — state generation is a one-shot
// operation that doesn't require human-in-the-loop or mid-run persistence.
export const stateGenerationGraph = new StateGraph(StateGenerationAnnotation)
  .addNode("load_context", loadContextNode)
  .addNode("compile_external", compileExternalNode)
  .addNode("generate_module", generateModuleNode)  // called N times in parallel via Send
  .addNode("save_state", saveStateNode)

  .addEdge("__start__", "load_context")
  .addEdge("load_context", "compile_external")

  // 💡 LangGraph: addConditionalEdges with dispatchModules returns Send[] objects.
  // This fans out to N parallel "generate_module" invocations.
  // The second argument to addConditionalEdges here is the names of possible targets.
  .addConditionalEdges("compile_external", dispatchModules, ["generate_module"])

  // 💡 LangGraph: After ALL generate_module tasks complete (fan-in), go to save_state.
  // LangGraph's Pregel-based execution model ensures save_state only runs
  // once all parallel module tasks have written their results to generatedModules.
  .addEdge("generate_module", "save_state")
  .addEdge("save_state", "__end__")

  .compile();
```

Visual graph:

```
[__start__]
     │
     ▼
load_context (DB: get user, yesterday's state)
     │
     ▼
compile_external (DB: save External record)
     │
     ▼ dispatchModules() → [ Send("generate_module", {exercise}), Send("generate_module", {nutrition}) ]
     │
     ├──────────────────────────────┐
     ▼                              ▼
generate_module(exercise)    generate_module(nutrition)    ← parallel
     │                              │
     └──────────────┬───────────────┘
                    ▼ (fan-in: all modules written to generatedModules)
               save_state
                    │
               [__end__]
```

### 2.5 Wiring into Existing Service

The `generateNewState()` in `lib/state/service.ts` can delegate to the graph:

```typescript
// In lib/state/service.ts — update generateNewState() to use the graph
import { stateGenerationGraph } from "@/lib/state/graph/graph";

export async function generateNewState(userId: string, date: Date): Promise<State> {
  // No checkpointer = no thread_id needed
  const result = await stateGenerationGraph.invoke({ userId, date });

  if (!result.savedState) {
    throw new Error("State generation graph completed without saving a state");
  }
  return result.savedState;
}
```

The `fetchStateAction()` in `lib/actions.ts` and all downstream code remains unchanged.

### 2.6 What Files Change — Full Impact List

| File | Change |
|---|---|
| `lib/state/services/modules.ts` | **No change** — `generateModule()` called inside node |
| `lib/state/services/full.ts` | **Deprecated** — `LLMGenerateState()` replaced by graph dispatch |
| `lib/state/services/mapping.ts` | **No change** — `getModuleBlueprint()` called inside node |
| `lib/state/service.ts` | **Minor** — `generateNewState()` delegates to graph |
| `lib/external/service.ts` | **No change** — `compileExternal()` called inside node |
| `lib/state/graph/` | **Create** (entire new directory) |
| `lib/actions.ts` | **No change** — `fetchStateAction()` still calls `generateNewState()` |

---

## Part 3: Migration Strategy — Rolling It Out Safely

Since there are no automated tests, do this incrementally:

### Phase 1: State Generation Graph (Lower Risk, No Human-in-Loop)

1. Create `lib/state/graph/` with all nodes and graph
2. Update `generateNewState()` to call the graph
3. Test by triggering `fetchStateAction()` from the dashboard's "force generate" dev button
4. Verify the DB record is identical to what the old code produced
5. Delete `lib/state/services/full.ts` once confirmed

**Why start here**: No UI changes. No checkpointer complexity. Clean one-shot flow.

### Phase 2: Onboarding — Baseline Steps

1. Create `lib/onboarding/graph/` with state, checkpointer, and baseline nodes only
2. Create `app/api/onboarding/route.ts` (start + resume for baseline only)
3. Modify `BaselinePage.tsx` to use the API instead of direct action calls
4. Test the slider → ICF conversion flow
5. Verify baseline is correctly saved to DB

**Why this second**: Baseline involves `interrupt()` but no conversational loop.

### Phase 3: Onboarding — Full Conversation Loop

1. Add `questioning` node and `generate_profile` node to the graph
2. Add `shouldContinueQuestioning` edge
3. Update `QuestionPage.tsx` to use the API
4. Test the full 5-question conversation flow
5. Verify profile is generated and `doneOnboarding` session field updates correctly

---

## Part 4: Custom Tooling Worth Building

These aren't strictly required but will pay off quickly:

### 4.1 Graph State Inspector (Dev Tool)

A dev-only page at `/admin/graph-inspector` that reads the raw checkpoint state for any user:

```typescript
// A server action to peek at the LangGraph checkpoint for a user
export async function getOnboardingGraphState(userId: string) {
  const config = { configurable: { thread_id: `onboarding-${userId}` } };
  const state = await onboardingGraph.getState(config);
  return state.values; // the full OnboardingState for this user
}
```

This lets you see exactly where in the graph a user is, what questions have been asked, and what the baseline looks like — without touching the DB directly.

### 4.2 LangSmith Tracing (Observability)

LangGraph natively integrates with LangSmith. Add to `.env.local`:

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_key_here
LANGCHAIN_PROJECT=mgc2025
```

Every graph invocation will be traced — you can see exactly which node ran, the LLM input/output, and timing. This replaces the `console.log()` calls scattered throughout the service files.

### 4.3 Dynamic Module Registry

Instead of hardcoding `['exercise', 'nutrition']` in `dispatch.ts`, create a registry driven by surgery type:

```typescript
// lib/state/graph/module-registry.ts
const MODULE_REGISTRY: Record<string, string[]> = {
  "total_knee_replacement": ["exercise", "nutrition", "wound_care"],
  "hip_replacement": ["exercise", "nutrition", "mobility"],
  "ACL_reconstruction": ["exercise", "nutrition"],
  default: ["exercise", "nutrition"],
};

export function getModulesForSurgery(treatment: string): string[] {
  return MODULE_REGISTRY[treatment] ?? MODULE_REGISTRY.default;
}
```

Then in `dispatch.ts`, get modules from `state.external.profile` (which contains surgery type) rather than a hardcoded list.

---

## Part 5: Key Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| LangGraph version | Already installed (`1.0.7`) | No install needed |
| Checkpointer (dev) | `MemorySaver` | Zero setup, but lost on server restart |
| Checkpointer (prod) | `PostgresSaver` from `@langchain/langgraph-checkpoint-postgres` | Reuses existing DB |
| Interrupt pattern | `interrupt()` inside nodes | Cleanest API for question/answer turns |
| Module parallelism | `Send` array from conditional edge | LangGraph-native, replaces `Promise.all` |
| Existing functions | Keep unchanged | Nodes are wrappers around existing logic |
| Thread persistence for conversation | Graph checkpoint (not Prisma Thread table mid-conversation) | Simpler; Thread is written once at profile generation |
| State generation checkpointer | None | One-shot execution, no persistence needed |
