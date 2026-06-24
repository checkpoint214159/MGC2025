import { interrupt } from "@langchain/langgraph";
import { updateThread } from "@/lib/user/service";
import { convertResponseToMessage } from "@/lib/external/schemas/message";
import { OnboardingLangGraphState } from "@/lib/onboarding/graph/annotation";

/**
 * Node: interrupt_question
 *
 * Interrupt point #2 (loops): surfaces the current question to the frontend
 * and waits for the user's answer.
 *
 * The interrupt value is { type, question, questionCount } — the frontend
 * inspects interruptValue.type to know which UI to render, and uses
 * question + questionCount to display the question card and progress pips.
 *
 * Resume input: string — the user's answer text.
 *
 * On resume, saves the answer message to the Prisma thread (separate from the
 * question message, which was already saved by generate_question before this
 * interrupt). Increments questionCount so generate_question knows how far along
 * we are on the next iteration.
 *
 * Why split from generate_question?
 * LangGraph re-executes a node from the top on resume. If generate_question and
 * the interrupt were in the same node, the LLM call and thread write would happen
 * AGAIN on resume (duplicate messages, extra LLM spend). Splitting ensures:
 *   - generate_question: runs to completion, commits thread + currentQuestion to annotation
 *   - interrupt_question: on resume, ONLY saves the answer and increments count
 */
export async function interruptQuestionNode(
    state: OnboardingLangGraphState,
): Promise<Partial<OnboardingLangGraphState>> {
    const answer: string = interrupt({
        type: "answer_question",
        question: state.currentQuestion,
        questionCount: state.questionCount,
    });

    const userMsg = convertResponseToMessage(
        answer,
        state.thread!.id,
        "onboarding",
    );
    const updatedThread = await updateThread(
        state.userId,
        state.thread!.id,
        "onboarding",
        [userMsg],
    );

    return { thread: updatedThread, questionCount: state.questionCount + 1 };
}
