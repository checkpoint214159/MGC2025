import { setProfile } from "@/lib/user/service";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

/**
 * Node: save_profile
 *
 * Persists the generated profile string to Prisma. This is the final write
 * of the onboarding graph — once it completes, doneOnboarding becomes true
 * (profile + biometric + screening all exist), and the session can be updated.
 */
export async function saveProfileNode(
  state: OnboardingLangGraphState
): Promise<Partial<OnboardingLangGraphState>> {
  await setProfile(state.userId, state.profile!);
  return {};
}
