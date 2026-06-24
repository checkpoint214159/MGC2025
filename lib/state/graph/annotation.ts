import { Annotation } from "@langchain/langgraph";
import { State } from "@/lib/state/schemas/state";
import { External } from "@/lib/external/schemas/external";
import type { PatientMemory } from "@/lib/memory/schema";
import type { RawWindow } from "@/lib/memory/service";
import type { RecoveryPhase } from "@/lib/engagement";

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

    // --- Compaction layer (built by load_context) ---
    // Two-tier consolidated memory (semantic facts + phase narrative). May be refreshed by the
    // consolidate_memory node before fan-out.
    patientMemory: Annotation<PatientMemory | null>({
        default: () => null,
        reducer: (_, incoming) => incoming,
    }),

    // Deterministic, code-computed signals (pain trend, adherence, streak, baseline deltas) —
    // fed to the model instead of raw numeric history. Identical across every module's Send.
    heuristicDigest: Annotation<string>({
        default: () => "",
        reducer: (_, incoming) => incoming,
    }),

    // Unconsolidated prose since the memory watermark — fed verbatim for recency, and folded
    // into memory when it crosses the consolidation threshold.
    rawWindow: Annotation<RawWindow>({
        default: () => ({
            text: "",
            newestAt: null,
            messageCount: 0,
            hasDoctorNote: false,
        }),
        reducer: (_, incoming) => incoming,
    }),

    // Recovery day + phase (from biometrics.surgeryDate), used for phase-organized consolidation.
    recoveryDay: Annotation<number | null>({
        default: () => null,
        reducer: (_, incoming) => incoming,
    }),
    recoveryPhase: Annotation<RecoveryPhase>({
        default: () => "early",
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

export type StateGenerationLangGraphState =
    typeof StateGenerationAnnotation.State;
