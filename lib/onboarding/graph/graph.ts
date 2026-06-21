import { StateGraph } from "@langchain/langgraph";
import { OnboardingAnnotation, OnboardingLangGraphState } from "./annotation";
import { getOnboardingCheckpointer } from "./checkpointer";
import { loadBiometricsNode } from "./nodes/load_biometrics";
import { collectScreeningResponsesNode } from "./nodes/collect_screening_responses";
import { evaluateScreeningNode } from "./nodes/evaluate_screening";
import { generateQuestionNode } from "./nodes/generate_question";
import { interruptQuestionNode } from "./nodes/interrupt_question";
import { generateProfileNode } from "./nodes/generate_profile";
import { saveProfileNode } from "./nodes/save_profile";

/**
 * Routes after evaluate_screening. An unsupervised patient who flagged any PAR-Q
 * item is blocked: the graph ends without building a profile. Everyone else
 * proceeds into the lifestyle conversation.
 */
function routeAfterScreening(
  state: OnboardingLangGraphState
): "generate_question" | "__end__" {
  return state.screeningBlocked ? "__end__" : "generate_question";
}

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
    .addNode("collect_screening_responses", collectScreeningResponsesNode)
    .addNode("evaluate_screening", evaluateScreeningNode)
    .addNode("generate_question", generateQuestionNode)
    .addNode("interrupt_question", interruptQuestionNode)
    .addNode("generate_profile", generateProfileNode)
    .addNode("save_profile", saveProfileNode)

    // --- Fixed edges: sequential steps ---
    .addEdge("__start__", "load_biometrics")
    .addEdge("load_biometrics", "collect_screening_responses")
    .addEdge("collect_screening_responses", "evaluate_screening")

    // --- Conditional: gate. Block unsupervised failures, else enter conversation ---
    .addConditionalEdges("evaluate_screening", routeAfterScreening, [
      "generate_question",
      "__end__",
    ])

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
