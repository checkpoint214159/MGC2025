import { interrupt } from "@langchain/langgraph";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

/**
 * Node: collect_baseline_responses
 *
 * Interrupt point #1: surfaces queryBaseline to the frontend and waits for
 * the user to fill in their slider values.
 *
 * The interrupt value is { type, queryBaseline } — the frontend inspects
 * interruptValue.type to know which UI to render.
 *
 * Resume input: Record<string, number> — the slider responses keyed by ICF code.
 *
 * On resume, interrupt() returns the responses and the node commits them to
 * the annotation for generate_baseline to consume.
 */
export async function collectBaselineResponsesNode(
  state: OnboardingLangGraphState
): Promise<Partial<OnboardingLangGraphState>> {
  const responses: Record<string, number> = interrupt({
    type: "collect_baseline_responses",
    queryBaseline: state.queryBaseline,
  });

  return { baselineResponses: responses };
}
