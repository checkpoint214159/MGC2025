import { Command } from "@langchain/langgraph";
import { prisma } from "@/lib/prisma";
import { getCompiledOnboardingGraph } from "./graph/graph";
import { ParqQuestion } from "@/lib/onboarding/screening";
import { BaseQuestion } from "@/lib/llm/schemas/base";
import { Thread } from "@/lib/external/schemas/thread";

// ---- Types ----------------------------------------------------------------

export type OnboardingPhase =
    | { phase: "biometrics" }
    | {
          phase: "collect_screening_responses";
          questions: ParqQuestion[];
      }
    | {
          phase: "answer_question";
          question: BaseQuestion;
          questionCount: number;
          thread: Thread | null;
      }
    | { phase: "screening_blocked" }
    | { phase: "complete" }
    | { phase: "error"; message: string };

// ---- Helpers ---------------------------------------------------------------

function graphConfig(userId: string) {
    return { configurable: { thread_id: userId } };
}

/**
 * Reads the current state of the onboarding graph checkpoint for this user.
 * If no checkpoint exists, falls back to checking Prisma directly.
 */
export async function getOnboardingState(
    userId: string,
): Promise<OnboardingPhase> {
    try {
        const graph = await getCompiledOnboardingGraph();
        const snapshot = await graph.getState(graphConfig(userId));

        // No checkpoint exists for this user
        if (!snapshot || !snapshot.values?.userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { profile: true },
            });
            // Profile present = already completed onboarding before this graph was introduced
            if (user?.profile) return { phase: "complete" };
            return { phase: "biometrics" };
        }

        // Graph ran to completion (no pending nodes). This is either a normal finish
        // (profile saved) or a hard stop from the screening gate (unsupervised + flagged).
        if (snapshot.next.length === 0) {
            if (snapshot.values.screeningBlocked) {
                return { phase: "screening_blocked" };
            }
            return { phase: "complete" };
        }

        // Extract the interrupt value from pending tasks
        const tasks = snapshot.tasks as any[];
        const interrupts = tasks.flatMap((t) => t.interrupts ?? []);
        const interruptValue = interrupts[0]?.value ?? null;

        if (!interruptValue) {
            // Shouldn't happen in normal flow — treat as needing biometrics
            return { phase: "biometrics" };
        }

        if (interruptValue.type === "collect_screening_responses") {
            return {
                phase: "collect_screening_responses",
                questions: interruptValue.questions,
            };
        }

        if (interruptValue.type === "answer_question") {
            return {
                phase: "answer_question",
                question: interruptValue.question,
                questionCount: interruptValue.questionCount,
                thread: snapshot.values.thread ?? null,
            };
        }

        return {
            phase: "error",
            message: `Unknown interrupt type: ${interruptValue.type}`,
        };
    } catch (err: any) {
        console.error("[getOnboardingState] error:", err);
        return { phase: "error", message: err.message };
    }
}

/**
 * Starts the onboarding graph for a user who has just submitted biometrics.
 * Runs the graph until the first interrupt (collect_screening_responses).
 */
export async function startOnboarding(
    userId: string,
): Promise<OnboardingPhase> {
    const graph = await getCompiledOnboardingGraph();
    await graph.invoke({ userId }, graphConfig(userId));
    return getOnboardingState(userId);
}

/**
 * Resumes the onboarding graph after a user submits input at an interrupt point.
 *
 * input is typed as any because it varies by interrupt:
 *   - collect_screening_responses: Record<string, boolean>  (PAR-Q YES/NO answers)
 *   - answer_question: string                               (free-text answer)
 */
export async function resumeOnboarding(
    userId: string,
    input: any,
): Promise<OnboardingPhase> {
    const graph = await getCompiledOnboardingGraph();
    await graph.invoke(new Command({ resume: input }), graphConfig(userId));
    return getOnboardingState(userId);
}
