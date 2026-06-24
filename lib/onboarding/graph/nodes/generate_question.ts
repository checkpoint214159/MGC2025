import {
    getInitialLLMQuestion,
    getNextLLMQuestion,
} from "@/lib/onboarding/questioning";
import { updateThread } from "@/lib/user/service";
import { convertQuestionToMessage } from "@/lib/external/schemas/message";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

const MAX_QUESTIONS = 5;

/**
 * Node: generate_question
 *
 * Generates the next conversation question and persists it to the onboarding thread.
 * This node runs before EACH interrupt_question pause, and again after the user answers
 * (looping back via the conditional edge in graph.ts).
 *
 * Termination conditions:
 *   - questionCount has reached MAX_QUESTIONS
 *   - LLM returns inputType === 'terminateQuestioning'
 *
 * On termination, sets shouldTerminate: true so the conditional edge routes
 * to generate_profile instead of interrupt_question.
 *
 * Writes the question message to Prisma before returning so that the annotation's
 * `thread` field is committed BEFORE the next interrupt, preventing duplicate
 * message saves on resume.
 */
export async function generateQuestionNode(
    state: OnboardingLangGraphState,
): Promise<Partial<OnboardingLangGraphState>> {
    if (state.questionCount >= MAX_QUESTIONS) {
        return { shouldTerminate: true };
    }

    const isFirstQuestion =
        state.questionCount === 0 &&
        (!state.thread || !state.thread.messages?.length);

    const question = isFirstQuestion
        ? await getInitialLLMQuestion(state.biometrics!)
        : await getNextLLMQuestion(state.biometrics!, state.thread!);

    if (question.inputType === "terminateQuestioning") {
        return { shouldTerminate: true, currentQuestion: null };
    }

    // Persist question message to Prisma so it survives before the interrupt
    const qnMsg = convertQuestionToMessage(
        question,
        state.thread?.id ?? null,
        "onboarding",
    );
    const thread = await updateThread(
        state.userId,
        state.thread?.id ?? null,
        "onboarding",
        [qnMsg],
    );

    return { currentQuestion: question, thread, shouldTerminate: false };
}
