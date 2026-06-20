"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Biometrics } from "@/lib/user/schema";
import { BaselineSchema, QueryBaseline, QueryBaselineSchema, QueryICFEntry } from "@/lib/user/baseline";
import { Slider } from "@/components/ui/slider";
import { Card, Button } from "@/components/ui/primitives";
import { generateBaselineAction, generateQueryBaselineAction, setBaselineAction, setQueryBaselineAction } from "@/lib/actions";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

interface BaselinePageProps {
  biometrics: Biometrics;
  queryBaseline: QueryBaseline | null;
}

export function BaselinePage({ biometrics, queryBaseline }: BaselinePageProps) {
  const queryClient = useQueryClient();
  const { data: session, update } = useSession();
  const reduce = useReducedMotion();
  // "success" is derived from queryBaseline being present, so we only track
  // generation loading vs error here.
  const [genState, setGenState] = useState<"loading" | "error">("loading");
  const startedRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatMetrics: QueryICFEntry[] = useMemo(() => {
    if (!queryBaseline?.axes) return [];
    return [
      ...Object.values(queryBaseline.axes.biomechanical?.entries || {}),
      ...Object.values(queryBaseline.axes.functional?.entries || []),
      ...Object.values(queryBaseline.axes.systemic?.entries || []),
    ];
  }, [queryBaseline]);

  const [responses, setResponses] = useState<Record<string, number>>({});
  useEffect(() => {
    if (flatMetrics.length > 0 && Object.keys(responses).length === 0) {
      setResponses(Object.fromEntries(flatMetrics.map((v) => [v.code, v.range / 2])));
    }
  }, [flatMetrics]);

  // Generate the query baseline once on first entry. Bounded by a timeout and a
  // recoverable error state so a slow/failed model call no longer hangs forever.
  const runGeneration = useCallback(async () => {
    try {
      const llmOutcome = await Promise.race([
        generateQueryBaselineAction(biometrics),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Generation timed out")), 90_000)),
      ]);
      if (!llmOutcome.success) throw new Error("LLM Generation failed");
      const validatedData = QueryBaselineSchema.parse(llmOutcome.data);
      await setQueryBaselineAction(validatedData);
      await queryClient.invalidateQueries({ queryKey: ["onboarding", session?.user?.id] });
      await update({ session });
    } catch (error) {
      console.error("Query baseline generation failed:", error);
      setGenState("error");
    }
  }, [biometrics, queryClient, session, update]);

  useEffect(() => {
    if (queryBaseline || startedRef.current) return;
    startedRef.current = true;
    void runGeneration();
  }, [queryBaseline, runGeneration]);

  const handleRetry = () => {
    setGenState("loading");
    startedRef.current = true;
    void runGeneration();
  };

  const createBaselines = async (bio: Biometrics, res: Record<string, number>, qb: QueryBaseline) =>
    generateBaselineAction(bio, res, qb);

  const currentMetric = flatMetrics[currentIndex];
  const progress = ((currentIndex + 1) / flatMetrics.length) * 100;

  const handleNext = async () => {
    if (!queryBaseline) {
      console.error("handleNext called with null queryBaseline");
      return;
    }
    if (currentIndex < flatMetrics.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      const result = await createBaselines(biometrics, responses, queryBaseline);
      const baselines = BaselineSchema.parse(result.data);
      await setBaselineAction(baselines);
      await update();
    }
  };

  const getUnitLabels = (unit: string) => {
    if (unit.toLowerCase().includes("scale")) return ["Severe", "Optimal"];
    if (unit.toLowerCase().includes("ml") || unit.toLowerCase().includes("meters")) return ["Low", "High"];
    return ["Limited", "Full"];
  };

  // 1. Loading (only while there is no baseline yet)
  if (!queryBaseline && genState === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-4 p-12 text-center">
        <Loader2 className="size-8 animate-spin text-accent" />
        <div className="space-y-1">
          <h3 className="text-[19px] font-semibold text-ink">Preparing your check-in</h3>
          <p className="text-[14px] text-ink-muted">Tailoring a few questions to {biometrics.treatment}…</p>
        </div>
      </div>
    );
  }

  // 2. Error (recoverable)
  if (!queryBaseline && genState === "error") {
    return (
      <Card className="mx-auto m-6 max-w-xl space-y-4 border-critical/20 bg-critical-soft/40 p-8 text-center">
        <AlertCircle className="mx-auto size-9 text-critical" />
        <div className="space-y-1">
          <h3 className="text-[19px] font-semibold text-ink">We couldn&apos;t prepare your check-in</h3>
          <p className="text-[14px] text-ink-muted">This can happen if the service is slow or overloaded.</p>
        </div>
        <Button variant="primary" onClick={handleRetry}>
          <RefreshCcw size={16} strokeWidth={1.75} /> Try again
        </Button>
      </Card>
    );
  }

  // 3. Empty data
  if (queryBaseline && flatMetrics.length === 0) {
    return (
      <Card className="mx-auto m-6 max-w-xl p-8 text-center">
        <p className="text-[14px] text-ink-muted">No specific metrics found for this procedure. Please contact your clinical lead.</p>
      </Card>
    );
  }

  // 4. Main UI
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 p-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-[26px] font-semibold text-ink">Your starting point</h1>
          <p className="text-[14px] text-ink-muted">Step {currentIndex + 1} of {flatMetrics.length}</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
          <motion.div
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.25, 1, 0.5, 1] }}
            className="h-full bg-accent"
          />
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentMetric.code}
          initial={reduce ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <Card className="space-y-8 p-7 md:p-8">
            <div className="space-y-3">
              <span className="text-[12px] font-medium text-ink-subtle">{currentMetric.domain}</span>
              <h2 className="text-[22px] font-semibold leading-snug text-ink">
                {currentMetric.question?.questionText || `Rate your ${currentMetric.indicator}`}
              </h2>
              <div className="rounded-md bg-surface-sunken p-3">
                <p className="text-[13px] text-ink-muted">{currentMetric.justification}</p>
              </div>
            </div>

            <div className="space-y-6 py-2">
              <div className="text-center">
                <span className="text-[32px] font-semibold tabular-nums text-accent-ink">
                  {responses[currentMetric.code] ?? Math.round(currentMetric.range / 2)}
                </span>
              </div>

              <Slider
                min={0}
                max={currentMetric.range}
                step={1}
                value={[responses[currentMetric.code] || Math.round(currentMetric.range / 2)]}
                onValueChange={([val]) => setResponses((prev) => ({ ...prev, [currentMetric.code]: val }))}
                aria-label={currentMetric.question?.questionText || `Rate your ${currentMetric.indicator}`}
                className="py-1"
              />

              <div className="flex justify-between text-[12px] font-medium text-ink-subtle">
                <span>{getUnitLabels(currentMetric.unit)[0]}</span>
                <span>{getUnitLabels(currentMetric.unit)[1]}</span>
              </div>
            </div>

            <div className="flex gap-3 border-t border-border pt-5">
              {currentIndex > 0 && (
                <Button variant="secondary" onClick={() => setCurrentIndex((prev) => prev - 1)}>
                  Back
                </Button>
              )}
              <Button variant="primary" size="lg" className="flex-1" onClick={handleNext}>
                {currentIndex === flatMetrics.length - 1 ? "Complete" : "Next"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
