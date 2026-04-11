import { Send } from "@langchain/langgraph";
import { StateGenerationLangGraphState } from "@/lib/state/graph/annotation";

/**
 * Helper: determine which modules should be generated for this state.
 *
 * Currently hardcoded to ['exercise', 'nutrition'], but can be made dynamic
 * based on surgery type, day of recovery, etc.
 *
 * Example extension:
 *   if (state.date day === 0) return ['wound_care', 'exercise', 'nutrition']
 *   if (state.date day > 5) return ['exercise', 'nutrition', 'physiotherapy']
 */
function getModuleKeysForState(_state: StateGenerationLangGraphState): string[] {
  return ["exercise", "nutrition"];
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
export function dispatchModules(
  state: StateGenerationLangGraphState
): Send[] {
  const moduleKeys = getModuleKeysForState(state);

  return moduleKeys.map(
    (moduleKey) =>
      new Send("generate_module", {
        // Each Send gets its own isolated input object
        // (not the full graph state, but only what generate_module needs)
        moduleKey,
        profile: state.external!.profile, // external guaranteed to exist at this stage
        transcripts: state.transcripts,
        previousModule:
          state.previousState?.modules?.find((m) => m.type === moduleKey) ?? null,
      })
  );
}
