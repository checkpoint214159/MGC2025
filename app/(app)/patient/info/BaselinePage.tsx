"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { QueryBaseline, QueryICFEntry } from "@/lib/user/baseline";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { resumeOnboardingAction } from "@/lib/actions";

interface BaselinePageProps {
  queryBaseline: QueryBaseline;
}

export function BaselinePage({ queryBaseline }: BaselinePageProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flatMetrics: QueryICFEntry[] = useMemo(() => {
    if (!queryBaseline?.axes) return [];
    return [
      ...Object.values(queryBaseline.axes.biomechanical?.entries || []),
      ...Object.values(queryBaseline.axes.functional?.entries || []),
      ...Object.values(queryBaseline.axes.systemic?.entries || []),
    ];
  }, [queryBaseline]);

  const [responses, setResponses] = useState<Record<string, number>>(() =>
    Object.fromEntries(flatMetrics.map((v) => [v.code, Math.round(v.range / 2)]))
  );

  // Sync default responses when flatMetrics first populates
  useEffect(() => {
    if (flatMetrics.length > 0 && Object.keys(responses).length === 0) {
      setResponses(
        Object.fromEntries(flatMetrics.map((v) => [v.code, Math.round(v.range / 2)]))
      );
    }
  }, [flatMetrics]);

  const currentMetric = flatMetrics[currentIndex];
  const progress = ((currentIndex + 1) / flatMetrics.length) * 100;

  const handleNext = async () => {
    if (currentIndex < flatMetrics.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    // Last slide — submit responses to graph
    setIsSubmitting(true);
    try {
      await resumeOnboardingAction(responses);
      // Invalidate so page.tsx re-fetches the new phase (answer_question)
      await queryClient.invalidateQueries({
        queryKey: ["onboarding-state", session?.user?.id],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUnitLabels = (unit: string) => {
    if (unit.toLowerCase().includes("scale")) return ["Severe", "Optimal"];
    if (unit.toLowerCase().includes("ml") || unit.toLowerCase().includes("meters"))
      return ["Low", "High"];
    return ["Limited", "Full"];
  };

  if (flatMetrics.length === 0) {
    return (
      <Card className="max-w-xl w-full mx-auto m-6 p-8 text-center">
        <p className="text-slate-500">
          No specific metrics found for this procedure. Please contact your clinical lead.
        </p>
      </Card>
    );
  }

  return (
    <div className="max-w-xl w-full mx-auto p-6 flex flex-col gap-8">
      {/* Header & Progress */}
      <div className="space-y-4 text-center">
        <div className="flex justify-between items-end">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-slate-900">Pre-Op Baseline</h2>
            <p className="text-slate-500 text-sm italic">
              Step {currentIndex + 1} of {flatMetrics.length}
            </p>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-400">
            FRAMEWORK: WHO-ICF
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-blue-600"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentMetric.code}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-8 space-y-8 shadow-xl border-slate-200">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400">
                  {currentMetric.domain}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-slate-800 leading-snug">
                {currentMetric.question?.questionText || `Rate your ${currentMetric.indicator}`}
              </h3>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-600 italic">{currentMetric.justification}</p>
              </div>
            </div>

            <div className="py-6 space-y-6">
              <div className="flex justify-center">
                <span className="text-5xl font-light text-blue-600">
                  {responses[currentMetric.code] ?? Math.round(currentMetric.range / 2)}
                </span>
              </div>

              <Slider
                min={0}
                max={currentMetric.range}
                step={1}
                value={[responses[currentMetric.code] ?? Math.round(currentMetric.range / 2)]}
                onValueChange={([val]) =>
                  setResponses((prev) => ({ ...prev, [currentMetric.code]: val }))
                }
              />

              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>{getUnitLabels(currentMetric.unit)[0]}</span>
                <span>{getUnitLabels(currentMetric.unit)[1]}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
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
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-6 text-lg"
              >
                {isSubmitting
                  ? "Processing..."
                  : currentIndex === flatMetrics.length - 1
                  ? "Complete Baseline"
                  : "Next Metric"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
