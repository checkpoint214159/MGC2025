import { generateModule } from "@/lib/state/services/modules";
import { StateGenerationState } from "../state";

/**
 * Input type for the generate_module node.
 *
 * 💡 LangGraph: When a node is invoked via Send from a conditional edge,
 * it receives the payload object as input (not the full graph state).
 * This allows nodes to declare what they actually need, rather than always
 * receiving the full state dict.
 *
 * This is the input structure created by dispatchModules() for each Send.
 */
interface ModuleGenerationInput {
  moduleKey: string;
  profile: string;
  transcripts: string;
  previousModule: any | null;
}

/**
 * Node: generate_module
 *
 * Maps to the generateModule(...) call inside the Promise.all in full.ts:
 * - Calls the existing generateModule() function from lib/state/services/modules.ts
 * - Returns partial state update: { generatedModules: { [moduleKey]: blueprint } }
 *
 * This node is INVOKED MULTIPLE TIMES IN PARALLEL (once per Send in the dispatch).
 * LangGraph's reducer on generatedModules merges each module's result into one dict.
 *
 * 💡 LangGraph: The return type is Partial<StateGenerationState> so the graph knows
 * how to merge the output. The generatedModules reducer combines all parallel results.
 *
 * 💡 Send Nodes: When invoked via Send, the input parameter is the Send payload
 * (ModuleGenerationInput), not the full StateGenerationState. This keeps the node
 * focused on what it actually needs.
 */
export async function generateModuleNode(
  input: ModuleGenerationInput
): Promise<Partial<StateGenerationState>> {
  const result = await generateModule(
    input.moduleKey,
    input.profile,
    input.transcripts,
    input.previousModule
  );

  return { generatedModules: { [input.moduleKey]: result } };
}
