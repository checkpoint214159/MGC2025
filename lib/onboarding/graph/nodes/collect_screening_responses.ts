import { interrupt } from "@langchain/langgraph";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";
import { PARQ_QUESTIONS, ScreeningAnswers } from "@/lib/onboarding/screening";

/**
 * Node: collect_screening_responses
 *
 * Interrupt point #1: surfaces the static PAR-Q questionnaire to the frontend
 * and waits for the user to answer YES/NO.
 *
 * The interrupt value is { type, questions } — the frontend inspects
 * interruptValue.type to know which UI to render. The questions are a static
 * constant (no LLM generation), included for convenience so the client can
 * render purely from graph state.
 *
 * Resume input: Record<string, boolean> — answers keyed by PAR-Q question id
 * (true = "YES", false = "NO").
 */
export async function collectScreeningResponsesNode(
    state: OnboardingLangGraphState,
): Promise<Partial<OnboardingLangGraphState>> {
    const responses: ScreeningAnswers = interrupt({
        type: "collect_screening_responses",
        questions: PARQ_QUESTIONS,
    });

    return { screeningResponses: responses };
}
