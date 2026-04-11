import { generateBaseline } from "@/lib/onboarding/baselines";
import { setBaseline } from "@/lib/user/service";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

/**
 * Node: generate_baseline
 *
 * LLM call: synthesizes the user's slider responses into a scored WHO-ICF baseline.
 * Also persists the result to Prisma immediately so it's recoverable outside the graph.
 */
export async function generateBaselineNode(
  state: OnboardingLangGraphState
): Promise<Partial<OnboardingLangGraphState>> {
  const baseline = await generateBaseline(
    state.biometrics!,
    state.baselineResponses,
    state.queryBaseline!
  );

  await setBaseline(state.userId, baseline);

  return { baseline };
}
