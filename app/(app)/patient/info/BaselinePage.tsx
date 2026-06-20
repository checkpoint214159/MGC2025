"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Biometrics } from "@/lib/user/schema";
import { BaselineSchema, QueryBaseline, QueryBaselineSchema, QueryICFEntry } from "@/lib/user/baseline"; // Our Zod schema
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/Card";
import { generateBaselineAction, generateQueryBaselineAction, getQueryBaselineAction, setBaselineAction, setQueryBaselineAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { z } from "zod"


interface BaselinePageProps {
  biometrics: Biometrics;
  queryBaseline: QueryBaseline | null;
}



export function BaselinePage({ biometrics, queryBaseline }: BaselinePageProps) {
  // local state management
  const queryClient = useQueryClient();
  const { data: session, status, update } = useSession();
  // "success" is derived from queryBaseline being present, so we only track
  // generation loading vs error here (no more orphaned "success" flag).
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
    // whenever flatmetrics change, populate responses accordingly
  useEffect(() => {
    if (flatMetrics.length > 0 && Object.keys(responses).length === 0) {
      const initial = Object.fromEntries(flatMetrics.map(v => [v.code, v.range / 2]));
      setResponses(initial);
    }
  }, [flatMetrics]);

  const [responses, setResponses] = useState<Record<string, number>>({});

  // Generate the query baseline once on first entry. Bounded by a timeout and a
  // recoverable error state, so a slow or failed model call no longer hangs the
  // spinner forever (previously the throw was swallowed and status stuck on loading).
  const runGeneration = useCallback(async () => {
    try {
      const llmOutcome = await Promise.race([
        generateQueryBaselineAction(biometrics),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Generation timed out")), 90_000)
        ),
      ]);
      if (!llmOutcome.success) throw new Error("LLM Generation failed");

      const validatedData = QueryBaselineSchema.parse(llmOutcome.data);
      await setQueryBaselineAction(validatedData);
      await queryClient.invalidateQueries({ queryKey: ["onboarding", session?.user?.id] });
      await update({ session });
      // On success the parent re-passes a non-null queryBaseline, which renders
      // the question flow below; no extra local state needed.
    } catch (error) {
      console.error("Query baseline generation failed:", error);
      setGenState("error");
    }
  }, [biometrics, queryClient, session, update]);

  // first-entry generate query (runs once; retry is explicit)
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

  const createBaselines = async (biometrics: Biometrics, responses: Record<string, number>, queryBaseline: QueryBaseline) => {
    return await generateBaselineAction(biometrics, responses, queryBaseline)
  }


    const currentMetric = flatMetrics[currentIndex];
    const progress = ((currentIndex + 1) / flatMetrics.length) * 100;

    const handleNext = async () => {
        if (!queryBaseline) {
          alert("Error! handleNext was somehow called with null queryBaseline!")
        } else {
          if (currentIndex < flatMetrics.length - 1) {
              setCurrentIndex(prev => prev + 1);
          } else {
              const result = await createBaselines(biometrics, responses, queryBaseline);
              const baselines = BaselineSchema.parse(result.data)
              console.log('baselines', baselines)
              await setBaselineAction(baselines)
              await update();
          }
        }
    };


  // Helper to get labels based on the specific ICF unit
  const getUnitLabels = (unit: string) => {
    if (unit.toLowerCase().includes("scale")) return ["Severe", "Optimal"];
    if (unit.toLowerCase().includes("ml") || unit.toLowerCase().includes("meters")) return ["Low", "High"];
    return ["Limited", "Full"];
  };

  // 1. Loading State (only while there is no baseline yet)
  if (!queryBaseline && genState === "loading") {
    return (
      <div className="max-w-xl w-full mx-auto p-12 flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-900">Generating Clinical Path</h3>
          <p className="text-sm text-slate-500">Mapping WHO-ICF metrics for {biometrics.treatment}...</p>
        </div>
      </div>
    );
  }

  // 2. Error State (recoverable — wired to retry)
  if (!queryBaseline && genState === "error") {
    return (
      <Card className="max-w-xl w-full mx-auto m-6 p-8 border-red-100 bg-red-50/30 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <div className="space-y-2">
          <h3 className="font-bold text-red-900">Generation Failed</h3>
          <p className="text-sm text-red-700">We couldn&apos;t map the WHO-ICF baseline for this procedure. This can happen if the model is slow or overloaded.</p>
        </div>
        <Button onClick={handleRetry} className="bg-blue-600 hover:bg-blue-700">
          <RefreshCcw className="h-4 w-4 mr-2" /> Try again
        </Button>
      </Card>
    );
  }

  // 3. Empty Data State (LLM returned nothing)
  if (queryBaseline && flatMetrics.length === 0) {
    return (
      <Card className="max-w-xl w-full mx-auto m-6 p-8 text-center">
        <p className="text-slate-500">No specific metrics found for this procedure. Please contact your clinical lead.</p>
      </Card>
    );
  }

  // 4. Main UI (Guaranteed to have currentMetric)
  return (
    <div className="max-w-xl w-full mx-auto p-6 flex flex-col gap-8">
      {/* Header & Progress */}
      <div className="space-y-4 text-center">
        <div className="flex justify-between items-end">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-slate-900">Pre-Op Baseline</h2>
            <p className="text-slate-500 text-sm italic">Step {currentIndex + 1} of {flatMetrics.length}</p>
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
                {/* <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                  currentMetric.axisType === 'A' ? 'bg-orange-500' :
                  currentMetric.axisType === 'B' ? 'bg-blue-500' : 'bg-emerald-500'
                }`}>
                  AXISType {currentMetric.axisType}
                </span> */}
                <span className="text-[10px] font-mono text-slate-400">
                  {currentMetric.domain}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-slate-800 leading-snug">
                {currentMetric.question?.questionText || `Rate your ${currentMetric.indicator}`}
              </h3>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-600 italic">
                   {currentMetric.justification}
                </p>
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
                value={[responses[currentMetric.code] || Math.round(currentMetric.range / 2)]}
                onValueChange={([val]) => setResponses(prev => ({ ...prev, [currentMetric.code]: val }))}
              />

              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>{getUnitLabels(currentMetric.unit)[0]}</span>
                <span>{getUnitLabels(currentMetric.unit)[1]}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {currentIndex > 0 && (
                <Button variant="ghost" onClick={() => setCurrentIndex(prev => prev - 1)}>
                  Back
                </Button>
              )}
              <Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700 py-6 text-lg">
                {currentIndex === flatMetrics.length - 1 ? "Complete Baseline" : "Next Metric"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
