import { generateUserProfile } from "@/lib/onboarding/profile";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

/**
 * Node: generate_profile
 *
 * LLM call: synthesizes the full onboarding thread, biometrics, and screening
 * result into a clinical profile string.
 */
export async function generateProfileNode(
  state: OnboardingLangGraphState
): Promise<Partial<OnboardingLangGraphState>> {
  const profile = await generateUserProfile({
    thread: state.thread!,
    biometrics: state.biometrics!,
    screening: state.screening!,
  });

  return { profile };
}
