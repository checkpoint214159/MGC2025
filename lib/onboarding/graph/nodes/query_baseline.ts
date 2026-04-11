import { generateQueryBaseline } from "@/lib/onboarding/baselines";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

/**
 * Node: generate_query_baseline
 *
 * LLM call: generates the ICF-grounded slider questions for the pre-op baseline.
 * Skipped if queryBaseline already exists in the annotation (e.g., on a graph restart
 * where this node runs again before reaching the checkpoint).
 *
 * Output flows directly into collect_baseline_responses where it is surfaced
 * to the frontend via interrupt().
 */
export async function generateQueryBaselineNode(
  state: OnboardingLangGraphState
): Promise<Partial<OnboardingLangGraphState>> {
  if (state.queryBaseline) return {};

  const queryBaseline = await generateQueryBaseline(state.userId, state.biometrics!);
  return { queryBaseline };
}
