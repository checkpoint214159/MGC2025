import { Send } from "@langchain/langgraph";
import { StateGenerationLangGraphState } from "@/lib/state/graph/annotation";
import { renderMemoryForPrompt } from "@/lib/memory/service";

/**
 * Which modules to generate for a given day's state.
 *
 * Each key maps to a blueprint in MODULE_REGISTRY (lib/state/services/mapping.ts) and a
 * Zod schema in lib/state/schemas/. One LLM call is made per key (in parallel — see
 * dispatchModules). Currently fixed; can be made dynamic later (surgery type, recovery
 * day, clinician overrides — e.g. drop "symptoms" after discharge, add "wound_care" in
 * the first post-op week).
 *
 *   - exercise   physiotherapy plan — goals the patient works toward
 *   - nutrition  dietitian plan — macros + a food checklist
 *   - sleep      a daily sleep-duration target
 *   - symptoms   daily pain/symptom TRACKING (goal 0) — the logged pain feeds the recovery
 *                arc + progress chart (lib/engagement/arc.ts) and the stagnation flag
 */
function getModuleKeysForState(
    _state: StateGenerationLangGraphState,
): string[] {
    return ["exercise", "nutrition", "sleep", "symptoms"];
}

/**
 * Conditional edge function: dispatchModules
 *
 * Maps to the Promise.all(modulesToGenerate.map(...)) in full.ts:
 * - Determines which modules to generate
 * - For each module, creates a Send object that triggers a parallel "generate_module" invocation
 *
 * Returns:
 *   Send[] — an array of Send objects, each targeting the "generate_module" node
 *
 * 💡 LangGraph: Returning Send[] from a conditional edge is the "fan-out" pattern.
 * LangGraph launches one task per Send object IN PARALLEL.
 * Each task runs with its own input (the payload in Send constructor).
 * After all parallel tasks complete, the graph moves to the next node (fan-in).
 */
export function dispatchModules(state: StateGenerationLangGraphState): Send[] {
    const moduleKeys = getModuleKeysForState(state);

    // Build the shared, compacted context ONCE — it's byte-identical across every module's Send,
    // so it caches as a common prompt prefix (cache hit after the first parallel call). Replaces
    // the old full-transcript blob: consolidated memory + deterministic digest + the small raw
    // window of prose since the last consolidation.
    const memoryBlock = renderMemoryForPrompt(state.patientMemory);

    console.log(
        `[state-gen] dispatching ${
            moduleKeys.length
        } module(s) to generate IN PARALLEL: ${moduleKeys.join(", ")}`,
    );

    return moduleKeys.map(
        (moduleKey) =>
            new Send("generate_module", {
                // Each Send gets its own isolated input object
                // (not the full graph state, but only what generate_module needs)
                moduleKey,
                memoryBlock,
                digest: state.heuristicDigest,
                rawWindow: state.rawWindow.text,
                previousModule:
                    state.previousState?.modules?.find(
                        (m) => m.type === moduleKey,
                    ) ?? null,
            }),
    );
}
