"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { BaseQuestion } from "@/lib/llm/schemas/base";
import { Thread } from "@/lib/external/schemas/thread";
import {
    AssistantMessageSchema,
    convertMessageToQuestion,
} from "@/lib/external/schemas/message";
import { resumeOnboardingAction } from "@/lib/actions";
import { DynamicQuestionCard, ThinkingCard } from "./QuestionCard";

interface QuestionPageProps {
    question: BaseQuestion;
    questionCount: number;
    thread: Thread | null;
}

export function QuestionPage({
    question,
    questionCount,
    thread,
}: QuestionPageProps) {
    const queryClient = useQueryClient();
    const { data: session, update } = useSession();
    const [isLoading, setIsLoading] = useState(false);

    async function handleAnswer(answer: string) {
        setIsLoading(true);
        try {
            const result = await resumeOnboardingAction(answer);
            if (!result.success) throw new Error(result.error);

            const nextPhase = result.data!;

            if (nextPhase.phase === "complete") {
                // Profile saved — refresh session so doneOnboarding becomes true
                await update();
                return;
            }

            // Next question is ready — re-fetch onboarding state so page.tsx renders it
            await queryClient.invalidateQueries({
                queryKey: ["onboarding-state", session?.user?.id],
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Build visible history from thread messages (faded, behind the active card).
    const history = (thread?.messages ?? [])
        .filter((m) => m.role === "assistant")
        .map((m) => convertMessageToQuestion(AssistantMessageSchema.parse(m)));

    // generate_question persists the current question to the thread BEFORE the interrupt,
    // so the last assistant message IS the active `question` prop. Drop it from history,
    // otherwise it renders twice (and collides on the questionText React key).
    const previousQuestions = history.slice(0, -1);
    const visibleHistory = previousQuestions.slice(-2);

    return (
        <div className="w-full max-w-xl flex flex-col gap-6">
            {/* Progress pips — one per question answered so far */}
            <div className="flex gap-2 justify-center px-10 mb-4">
                {Array.from({ length: questionCount }).map((_, i) => (
                    <motion.div
                        key={i}
                        layoutId={`pip-${i}`}
                        className="h-1.5 flex-1 rounded-full bg-accent"
                    />
                ))}
            </div>

            {/* Scroll stack of previous questions (faded) */}
            <div className="flex flex-col gap-6 transition-all duration-700">
                {visibleHistory.map((q) => (
                    // Previously-answered questions are always faded and read-only.
                    // DynamicQuestionCard renders its inputs only when fade is false, so the
                    // single interactive card is the current `question` prop rendered below.
                    <motion.div
                        key={q.questionText}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{
                            opacity: 0.4,
                            y: 0,
                            scale: 0.95,
                            marginTop: "-20px",
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                        }}
                    >
                        <DynamicQuestionCard
                            question={q}
                            onAnswer={handleAnswer}
                            loading={isLoading}
                            fade={true}
                        />
                    </motion.div>
                ))}

                {/* Current active question card */}
                {!isLoading && (
                    <motion.div
                        key={question.questionText}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                        }}
                    >
                        <DynamicQuestionCard
                            question={question}
                            onAnswer={handleAnswer}
                            loading={false}
                            fade={false}
                        />
                    </motion.div>
                )}

                {isLoading && (
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
    );
}
