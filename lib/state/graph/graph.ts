import { StateGraph } from "@langchain/langgraph";
import { StateGenerationAnnotation } from "./state";
import { loadContextNode } from "./nodes/context";
import { compileExternalNode } from "./nodes/external";
import { dispatchModules } from "./nodes/dispatch";
import { generateModuleNode } from "./nodes/module";
import { saveStateNode } from "./nodes/save";

/**
 * stateGenerationGraph
 *
 * Orchestrates the daily state generation workflow using LangGraph.
 *
 * Flow:
 *   [__start__] 
 *     → load_context (DB: get user, yesterday's state, build transcripts)
 *     → compile_external (DB: save External record)
 *     → dispatchModules (fan-out via Send)
 *     → [parallel] generate_module × N (for each module key)
 *     → [fan-in] saveState (write final State to DB)
 *     → [__end__]
 *
 * 💡 LangGraph: StateGraph is the container. We pass StateGenerationAnnotation
 * so LangGraph knows the state shape and what reducers to use for each field.
 * .compile() creates the final executable graph with no checkpointer
 * (state generation is a one-shot operation, not human-in-the-loop).
 */
export const stateGenerationGraph = new StateGraph(StateGenerationAnnotation)
  // --- Register nodes ---
  .addNode("load_context", loadContextNode)
  .addNode("compile_external", compileExternalNode)
  .addNode("generate_module", generateModuleNode)
  .addNode("save_state", saveStateNode)

  // --- Wire up fixed edges ---
  .addEdge("__start__", "load_context")
  .addEdge("load_context", "compile_external")

  // 💡 After all generate_module tasks complete, go to save_state.
  // LangGraph's Pregel-based execution model ensures save_state only runs
  // once all parallel module tasks have written to generatedModules.
  .addEdge("generate_module", "save_state")
  .addEdge("save_state", "__end__")

  // --- Conditional edge: fan-out via Send ---
  // dispatchModules returns Send[] objects.
  // LangGraph launches one parallel task per Send, each targeting "generate_module".
  // The second argument is the list of node names that Send can target.
  .addConditionalEdges("compile_external", dispatchModules, ["generate_module"])

  // No checkpointer needed — state generation is a one-shot operation.
  // If persistence across multiple invocations were needed, pass a checkpointer here:
  //
  //   .compile({ checkpointer: new MemorySaver() })
  //
  // For now, the graph is stateless (no thread_id in config).
  .compile();
