"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ParqQuestion } from "@/lib/onboarding/screening";
import { Button, Chip, ProgressBar } from "@/components/ui/primitives";
import { resumeOnboardingAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface ScreeningPageProps {
    questions: ParqQuestion[];
}

export function ScreeningPage({ questions }: ScreeningPageProps) {
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [responses, setResponses] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (questions.length === 0) {
        return (
            <div className="mx-auto w-full max-w-xl rounded-xl border border-border bg-surface p-8 text-center">
                <p className="text-[15px] text-ink-muted">
                    No screening questions available. Please contact your
                    clinical lead.
                </p>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const currentAnswer = responses[currentQuestion.id];
    const isLast = currentIndex === questions.length - 1;

    const answer = (value: boolean) => {
        setResponses((prev) => ({ ...prev, [currentQuestion.id]: value }));
    };

    const handleNext = async () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            return;
        }

        // Last question — submit all answers to the graph.
        setIsSubmitting(true);
        try {
            await resumeOnboardingAction(responses);
            await queryClient.invalidateQueries({
                queryKey: ["onboarding-state", session?.user?.id],
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex w-full max-w-xl flex-col gap-8">
            {/* Header & progress */}
            <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h2 className="text-[22px] font-semibold text-ink">
                            Activity readiness
                        </h2>
                        <p className="mt-0.5 text-[14px] text-ink-muted">
                            Question {currentIndex + 1} of {questions.length}
                        </p>
                    </div>
                    <Chip tone="neutral" size="md">
                        Readiness check
                    </Chip>
                </div>

                <ProgressBar
                    value={currentIndex + 1}
                    max={questions.length}
                    tone="accent"
                    size="md"
                />

                <p className="text-[13px] text-ink-subtle">
                    Please answer each question honestly.
                </p>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="space-y-8 rounded-xl border border-border bg-surface p-7 md:p-8">
                        <h3 className="min-h-[4.5rem] text-[19px] font-semibold leading-snug text-ink">
                            {currentQuestion.text}
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => answer(false)}
                                disabled={isSubmitting}
                                aria-pressed={currentAnswer === false}
                                className={cn(
                                    "min-h-14 rounded-md border text-[16px] font-medium transition-colors disabled:opacity-50",
                                    currentAnswer === false
                                        ? "border-accent bg-accent-soft text-accent-ink"
                                        : "border-border bg-surface text-ink-muted hover:bg-surface-sunken hover:text-ink",
                                )}
                            >
                                No
                            </button>
                            <button
                                type="button"
                                onClick={() => answer(true)}
                                disabled={isSubmitting}
                                aria-pressed={currentAnswer === true}
                                className={cn(
                                    "min-h-14 rounded-md border text-[16px] font-medium transition-colors disabled:opacity-50",
                                    currentAnswer === true
                                        ? "border-attention bg-attention-soft text-attention-ink"
                                        : "border-border bg-surface text-ink-muted hover:bg-surface-sunken hover:text-ink",
                                )}
                            >
                                Yes
                            </button>
                        </div>

                        <div className="flex gap-3 pt-1">
                            {currentIndex > 0 && (
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    onClick={() =>
                                        setCurrentIndex((prev) => prev - 1)
                                    }
                                    disabled={isSubmitting}
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleNext}
                                loading={isSubmitting}
                                disabled={currentAnswer === undefined}
                                className="flex-1"
                            >
                                {isLast ? "Complete screening" : "Next"}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
