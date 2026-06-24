import { prisma } from "@/lib/prisma";
import { BiometricsSchema } from "@/lib/user/schema";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

/**
 * Node: load_biometrics
 *
 * Reads the user's biometrics from Prisma and places them in the annotation.
 * Throws if biometrics are missing — the graph should only be invoked after
 * the biometrics form has been submitted.
 */
export async function loadBiometricsNode(
    state: OnboardingLangGraphState,
): Promise<Partial<OnboardingLangGraphState>> {
    const user = await prisma.user.findUnique({
        where: { id: state.userId },
        include: { biometric: true },
    });

    if (!user?.biometric) {
        throw new Error(
            `No biometrics found for user ${state.userId}. Submit biometrics before starting the onboarding graph.`,
        );
    }

    return { biometrics: BiometricsSchema.parse(user.biometric) };
}
