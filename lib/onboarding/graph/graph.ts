import { StateGraph } from "@langchain/langgraph";
import { OnboardingAnnotation, OnboardingLangGraphState } from "./annotation";
import { getOnboardingCheckpointer } from "./checkpointer";
import { loadBiometricsNode } from "./nodes/load_biometrics";
import { generateQueryBaselineNode } from "./nodes/query_baseline";
import { collectBaselineResponsesNode } from "./nodes/collect_responses";
import { generateBaselineNode } from "./nodes/generate_baseline";
import { generateQuestionNode } from "./nodes/generate_question";
import { interruptQuestionNode } from "./nodes/interrupt_question";
import { generateProfileNode } from "./nodes/generate_profile";
import { saveProfileNode } from "./nodes/save_profile";

/**
 * Routes after generate_question based on whether the conversation is done.
 * Termination is signalled by shouldTerminate: true (LLM returned
 * terminateQuestioning, or questionCount reached MAX_QUESTIONS).
 */
function routeAfterGenerateQuestion(
  state: OnboardingLangGraphState
): "generate_profile" | "interrupt_question" {
  return state.shouldTerminate ? "generate_profile" : "interrupt_question";
}

/**
 * Singleton compiled graph. Lazily initialized so the checkpointer's async
 * setup() only runs once per process.
 */
let _compiled: Awaited<ReturnType<typeof buildGraph>> | null = null;

async function buildGraph() {
  const checkpointer = await getOnboardingCheckpointer();

  return new StateGraph(OnboardingAnnotation)
    // --- Nodes ---
    .addNode("load_biometrics", loadBiometricsNode)
    .addNode("generate_query_baseline", generateQueryBaselineNode)
    .addNode("collect_baseline_responses", collectBaselineResponsesNode)
    .addNode("generate_baseline", generateBaselineNode)
    .addNode("generate_question", generateQuestionNode)
    .addNode("interrupt_question", interruptQuestionNode)
    .addNode("generate_profile", generateProfileNode)
    .addNode("save_profile", saveProfileNode)

    // --- Fixed edges: sequential steps ---
    .addEdge("__start__", "load_biometrics")
    .addEdge("load_biometrics", "generate_query_baseline")
    .addEdge("generate_query_baseline", "collect_baseline_responses")
    .addEdge("collect_baseline_responses", "generate_baseline")
    .addEdge("generate_baseline", "generate_question")

    // --- Conditional: after generate_question, either ask next question or finalize ---
    .addConditionalEdges("generate_question", routeAfterGenerateQuestion, [
      "generate_profile",
      "interrupt_question",
    ])

    // --- Loop: after receiving answer, generate the next question ---
    .addEdge("interrupt_question", "generate_question")

    // --- Finalization ---
    .addEdge("generate_profile", "save_profile")
    .addEdge("save_profile", "__end__")

    .compile({ checkpointer });
}

export async function getCompiledOnboardingGraph() {
  if (!_compiled) {
    _compiled = await buildGraph();
  }
  return _compiled;
}
