import { prisma } from "@/lib/prisma";
import { evaluateScreening } from "@/lib/onboarding/screening";
import { setScreening } from "@/lib/user/service";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

/**
 * Node: evaluate_screening
 *
 * Pure gate (no LLM). Determines whether the patient is supervised (assigned to a
 * doctor via AdminPatientRelation) and applies the deterministic PAR-Q rule.
 *
 * Persists the result to Prisma immediately so it's recoverable outside the graph,
 * and sets screeningBlocked so the graph can route an unsupervised, flagged patient
 * straight to __end__ (blocking onboarding) instead of into the lifestyle loop.
 */
export async function evaluateScreeningNode(
    state: OnboardingLangGraphState,
): Promise<Partial<OnboardingLangGraphState>> {
    // A patient is "supervised" if a doctor manages them (patientId is unique on the relation).
    const relation = await prisma.adminPatientRelation.findUnique({
        where: { patientId: state.userId },
        select: { id: true },
    });
    const supervised = relation !== null;

    const screening = evaluateScreening(state.screeningResponses, supervised);

    await setScreening(state.userId, screening);

    return { screening, screeningBlocked: !screening.passed };
}
