"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ParqQuestion } from "@/lib/onboarding/screening";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { resumeOnboardingAction } from "@/lib/actions";

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
      <Card className="max-w-xl w-full mx-auto m-6 p-8 text-center">
        <p className="text-slate-500">
          No screening questions available. Please contact your clinical lead.
        </p>
      </Card>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = responses[currentQuestion.id];
  const progress = ((currentIndex + 1) / questions.length) * 100;

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
    <div className="max-w-xl w-full mx-auto p-6 flex flex-col gap-8">
      {/* Header & Progress */}
      <div className="space-y-4 text-center">
        <div className="flex justify-between items-end">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-slate-900">Activity Readiness</h2>
            <p className="text-slate-500 text-sm italic">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-400">
            SCREENING: PAR-Q
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-blue-600"
          />
        </div>

        <p className="text-xs text-slate-400 text-left">
          Please answer each question honestly. Answer &ldquo;Yes&rdquo; or &ldquo;No&rdquo;.
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-8 space-y-8 shadow-xl border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 leading-snug min-h-[5rem]">
              {currentQuestion.text}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={currentAnswer === false ? "default" : "ghost"}
                onClick={() => answer(false)}
                disabled={isSubmitting}
                className={
                  currentAnswer === false
                    ? "py-6 text-lg bg-blue-600 hover:bg-blue-700"
                    : "py-6 text-lg border border-slate-200"
                }
              >
                No
              </Button>
              <Button
                variant={currentAnswer === true ? "default" : "ghost"}
                onClick={() => answer(true)}
                disabled={isSubmitting}
                className={
                  currentAnswer === true
                    ? "py-6 text-lg bg-amber-500 hover:bg-amber-600"
                    : "py-6 text-lg border border-slate-200"
                }
              >
                Yes
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              {currentIndex > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={isSubmitting || currentAnswer === undefined}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-6 text-lg"
              >
                {isSubmitting
                  ? "Processing..."
                  : currentIndex === questions.length - 1
                  ? "Complete Screening"
                  : "Next"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
