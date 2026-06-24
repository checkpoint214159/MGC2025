import { generateModule } from "@/lib/state/services/modules";
import { StateGenerationLangGraphState } from "@/lib/state/graph/annotation";

/**
 *
 * This is the input structure created by dispatchModules() for each Send.
 */
interface ModuleGenerationInput {
    moduleKey: string;
    memoryBlock: string; // rendered consolidated memory (semantic + phase narrative)
    digest: string; // deterministic heuristic signals
    rawWindow: string; // unconsolidated prose since the memory watermark
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
 * 💡 LangGraph: The return type is Partial<StateGenerationLangGraphState> so the graph knows
 * how to merge the output. The generatedModules reducer combines all parallel results.
 *
 * 💡 Send Nodes: When invoked via Send, the input parameter is the Send payload
 * (ModuleGenerationInput), not the full StateGenerationLangGraphState. This keeps the node
 * focused on what it actually needs.
 */
export async function generateModuleNode(
    input: ModuleGenerationInput,
): Promise<Partial<StateGenerationLangGraphState>> {
    const result = await generateModule(
        input.moduleKey,
        {
            memoryBlock: input.memoryBlock,
            digest: input.digest,
            rawWindow: input.rawWindow,
        },
        input.previousModule,
    );

    return { generatedModules: { [input.moduleKey]: result } };
}
