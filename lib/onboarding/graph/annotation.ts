import { Annotation } from "@langchain/langgraph";
import { Biometrics } from "@/lib/user/schema";
import { QueryBaseline, Baseline } from "@/lib/user/baseline";
import { Thread } from "@/lib/external/schemas/thread";
import { BaseQuestion } from "@/lib/llm/schemas/base";

/**
 * OnboardingAnnotation defines the shared state shape for the onboarding graph.
 *
 * Unlike stateGenerationGraph (one-shot, no checkpointer), this graph is
 * session-resumable — it pauses at interrupt() calls and persists state via
 * PostgresSaver so the user can refresh the page and continue exactly where
 * they left off.
 *
 * Flow:
 *   load_biometrics → generate_query_baseline → collect_baseline_responses (interrupt)
 *   → generate_baseline → generate_question ↔ interrupt_question (loop, interrupt)
 *   → generate_profile → save_profile → [__end__]
 */
export const OnboardingAnnotation = Annotation.Root({
  // --- Input: provided on first invocation ---
  userId: Annotation<string>(),

  // --- Loaded from DB by load_biometrics ---
  biometrics: Annotation<Biometrics | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),

  // --- LLM-generated questions used for baseline sliders ---
  queryBaseline: Annotation<QueryBaseline | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),

  // --- User slider responses (submitted at the collect_baseline_responses interrupt) ---
  baselineResponses: Annotation<Record<string, number>>({
    default: () => ({}),
    reducer: (_, incoming) => incoming,
  }),

  // --- Clinical baseline synthesized from slider responses ---
  baseline: Annotation<Baseline | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),

  // --- Onboarding thread (grows as conversation messages are appended) ---
  thread: Annotation<Thread | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),

  // --- Current question being asked (set by generate_question, used by interrupt_question) ---
  currentQuestion: Annotation<BaseQuestion | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),

  // --- Number of questions answered so far ---
  questionCount: Annotation<number>({
    default: () => 0,
    reducer: (_, incoming) => incoming,
  }),

  // --- Set to true by generate_question when LLM signals termination or max questions reached ---
  shouldTerminate: Annotation<boolean>({
    default: () => false,
    reducer: (_, incoming) => incoming,
  }),

  // --- Final synthesized profile string ---
  profile: Annotation<string | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),
});

export type OnboardingLangGraphState = typeof OnboardingAnnotation.State;
