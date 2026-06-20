import { Annotation } from "@langchain/langgraph";
import { State } from "@/lib/state/schemas/state";
import { External } from "@/lib/external/schemas/external";

/**
 * StateGenerationAnnotation defines the shared state shape for the state generation graph.
 *
 * 💡 LangGraph Concept: Annotation.Root creates a state container with per-field reducers.
 * - Simple fields (with no reducer specified) use last-write-wins
 * - Fields with custom reducers can merge, append, or apply custom logic
 *
 * The state flows through nodes in this order:
 * 1. load_context: loads previous state + builds transcripts
 * 2. compile_external: saves External record (threads + profile)
 * 3. dispatch_modules: fans out N parallel "generate_module" calls via Send
 * 4. save_state: writes final State to DB (fan-in after modules complete)
 */
export const StateGenerationAnnotation = Annotation.Root({
  // --- Inputs: provided when graph is invoked ---
  userId: Annotation<string>(),
  date: Annotation<Date>(),

  // --- Loaded from database ---
  previousState: Annotation<State | null>({
    default: () => null,
    reducer: (_, incoming) => incoming, // last-write-wins
  }),

  // Built by load_context node: concatenated transcript string
  transcripts: Annotation<string>({
    default: () => "",
    reducer: (_, incoming) => incoming,
  }),

  // All historical states loaded by load_context (configurable window)
  stateHistory: Annotation<State[]>({
    default: () => [],
    reducer: (_, incoming) => incoming,
  }),

  // Metadata about context selection for audit trail
  contextMetadata: Annotation<Record<string, any>>({
    default: () => ({}),
    reducer: (_, incoming) => incoming,
  }),

  // --- Compiled external context ---
  // Created by compile_external node: saved to DB and returned
  external: Annotation<External | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),

  // --- per-module outputs are accumulated via Map-Reduce ---
  // 💡 LangGraph is designed for this use case: each parallel generate_module
  // invocation writes { generatedModules: { [key]: blueprint } }.
  // The merge reducer combines all modules:
  //   exercise → { generatedModules: { exercise: {...} } }
  //   nutrition → { generatedModules: { nutrition: {...} } }
  // etc etc...
  //   Final → { generatedModules: { exercise: {...}, nutrition: {...} } }
  generatedModules: Annotation<Record<string, any>>({
    default: () => ({}),
    reducer: (existing, incoming) => ({ ...existing, ...incoming }),
  }),

  // --- Final saved state ---
  // Written by save_state node
  savedState: Annotation<State | null>({
    default: () => null,
    reducer: (_, incoming) => incoming,
  }),
});

export type StateGenerationLangGraphState = typeof StateGenerationAnnotation.State;
