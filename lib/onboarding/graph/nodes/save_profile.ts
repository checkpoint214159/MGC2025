import { setProfile } from "@/lib/user/service";
import { seedPatientMemory } from "@/lib/memory/service";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

/**
 * Node: save_profile
 *
 * Persists the generated profile string to Prisma. This is the final write
 * of the onboarding graph — once it completes, doneOnboarding becomes true
 * (profile + biometric + screening all exist), and the session can be updated.
 *
 * Also seeds the patient's long-running memory: the generated profile becomes the
 * SEMANTIC tier (stable clinical facts). From here it's maintained by the consolidation
 * pass in the state-generation graph rather than frozen at day 0.
 */
export async function saveProfileNode(
    state: OnboardingLangGraphState,
): Promise<Partial<OnboardingLangGraphState>> {
    await setProfile(state.userId, state.profile!);
    await seedPatientMemory(state.userId, state.profile!);
    return {};
}
