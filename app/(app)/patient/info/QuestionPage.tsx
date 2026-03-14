import { generateUserProfileAction, setProfileAction, updateThreadAction } from "@/lib/actions";
import { AssistantMessageSchema, convertMessageToQuestion, convertQuestionToMessage, convertResponseToMessage } from "@/lib/external/schemas/message";
import { Thread } from "@/lib/external/schemas/thread";
import { BaseQuestion } from "@/lib/llm/schemas/base";
import { getInitialLLMQuestion, getNextLLMQuestion } from "@/lib/onboarding/questioning";
import { Baseline } from "@/lib/user/baseline";
import { Biometrics } from "@/lib/user/schema";
import { ensureAction } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DynamicQuestionCard, ThinkingCard } from "./QuestionCard"
import { motion } from "framer-motion";


interface QuestionPageProps {
  biometrics: Biometrics;
  baseline: Baseline;
  thread: Thread | null;
}

export function QuestionPage({biometrics, baseline, thread}: QuestionPageProps) {
    const [currentQuestion, setCurrentQuestion] = useState<BaseQuestion | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const { data: session, update } = useSession();
    const router = useRouter();
    const [activeThread, setActiveThread] = useState<Thread | null>(thread);
    console.log('activeThread?', activeThread)

    // question-initing effect
    useEffect(() => {
        const isThreadEmpty = !activeThread || activeThread.messages?.length === 0;
        if (isThreadEmpty) {
            console.log('running nextQn log')
            nextQuestion(null);
        }
    }, [thread]);

    async function makeThread(existingThread: Thread | null) {
        if (existingThread?.id) return existingThread;
        const threadResult = await updateThreadAction({
            threadId: thread?.id ?? null,
            threadType: 'onboarding',
            messages: []
        });
        return ensureAction(threadResult)
    }

    async function nextQuestion(answer: string | null) {
        if (!biometrics || !session?.user?.id) return;
        setIsAiLoading(true)

        let currentThread = await makeThread(activeThread);
        let nextQn: BaseQuestion
        let updated: Thread

        if (!answer) {
            // first question
            nextQn = await getInitialLLMQuestion(biometrics, baseline) 
            updated = currentThread
        } else {
            // generate next qn
            const userMsg = convertResponseToMessage(answer, currentThread.id, 'onboarding')
            const result = await updateThreadAction({
                threadId: currentThread.id,
                threadType: 'onboarding',
                messages: [userMsg]
            });

            updated = ensureAction(result)
            nextQn = await getNextLLMQuestion(biometrics, updated, baseline) 
        }
        const numQuestions = (currentThread?.messages ?? [])
            .filter(m => m.role === 'assistant').length
        console.log('numQuestions', numQuestions)

        if (nextQn.inputType === 'terminateQuestioning' || numQuestions > 5) {
            try {
                const {data: profile} = await generateUserProfileAction({ thread: updated, biometrics: biometrics, baseline: baseline });
                await setProfileAction(profile ?? "");
                await update(); 
                router.push('/');
                return;
            } catch (e) {
                console.error("Finalization failed", e);
            } finally {
                setIsAiLoading(false);
            }
        }

        const qnMsg = convertQuestionToMessage(nextQn, updated?.id ?? null, 'onboarding')
        const llmUpdated = await updateThreadAction({
            threadId: currentThread.id,
            threadType: 'onboarding',
            messages: [qnMsg]
        });

        updated = ensureAction(llmUpdated)
        setActiveThread(updated)
        setCurrentQuestion(nextQn)
        setIsAiLoading(false);
    }

    const history = (activeThread?.messages ?? [])
    .filter(m => m.role === 'assistant')
    .map(m => convertMessageToQuestion(AssistantMessageSchema.parse(m)));
    
    // slice to prevent clogging. if ai is loading, the active becomes answered
    const visibleHistory = history.slice(-2);

    return (
        <div className="flex flex-col items-center justify-start min-h-screen bg-[#f8fafc] p-6 overflow-hidden pt-20">
            <div className="w-full max-w-xl flex flex-col gap-6">
            {/* progress pips */}
            <div className="flex gap-2 justify-center px-10 mb-4">
                {history.map((_, i) => (
                <motion.div 
                    key={i} 
                    layoutId={`pip-${i}`}
                    className="h-1.5 flex-1 rounded-full bg-blue-600" 
                />
                ))}
            </div>

        {/* THE SCROLL STACK */}
        <div className="flex flex-col gap-6 transition-all duration-700">
            {visibleHistory.map((q, index) => {
              const isLast = index === visibleHistory.length - 1;
              const fade = !isLast || isAiLoading;

              return (
                <motion.div
                  key={q.questionText} // Use text as key for animation
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ 
                    opacity: fade ? 0.4 : 1, 
                    y: 0, 
                    scale: fade ? 0.95 : 1,
                    // When it's past, we shift it up slightly
                    marginTop: fade ? "-20px" : "0px" 
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <DynamicQuestionCard 
                    question={q} 
                    onAnswer={nextQuestion} 
                    loading={isAiLoading}
                    fade={fade} 
                  />
                </motion.div>
            );
        })}

            {/* AI THINKING CARD */}
        {isAiLoading && (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
            >
            <ThinkingCard />
            </motion.div>
        )}
        </div>
        </div>
    </div>
  );
}