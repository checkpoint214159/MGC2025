"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Biometrics } from "@/lib/user/schema";
import { Baseline, BaselineSchema, ICFEntrySchema, QueryBaseline, QueryBaselineSchema } from "@/lib/user/baseline"; // Our Zod schema
import { Slider } from "@/components/ui/slider"; 
import { Card } from "@/components/ui/Card";
import { generateBaselineAction, generateQueryBaselineAction, getQueryBaselineAction, setBaselineAction, setQueryBaselineAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { generateBaseline } from "@/lib/user/service";


interface BaselinePageProps {
  biometrics: Biometrics;
  queryBaseline: QueryBaseline | null;
}


export function BaselinePage({ biometrics, queryBaseline }: BaselinePageProps) {
  // local state management
  const queryClient = useQueryClient();
  const { data: session, status, update } = useSession();
  const [ queryGenStatus, setqueryGenStatus] = useState<"loading" | "error" | "success">("loading");
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatMetrics = useMemo(() => {
    if (!queryBaseline?.axes) return [];
    
    return [
    ...(queryBaseline.axes.biomechanical?.entries || []).map(e => ({ ...e, axis: 'A' })),
    ...(queryBaseline.axes.functional?.entries || []).map(e => ({ ...e, axis: 'B' })),
    ...(queryBaseline.axes.systemic?.entries || []).map(e => ({ ...e, axis: 'C' })),
    ].filter(Boolean); // Ensure no null entries sneak in
  }, [queryBaseline]);
    // whenever flatmetrics change, populate responses accordingly
  useEffect(() => {
    if (flatMetrics.length > 0 && Object.keys(responses).length === 0) {
      const initial = Object.fromEntries(flatMetrics.map(v => [v.code, v.range / 2]));
      setResponses(initial);
    }
  }, [flatMetrics]);

  const [responses, setResponses] = useState<Record<string, number>>({});
    
  // first-entry generate query
  useEffect(() => {
    const initQueryBaseline = async () => {
      if (!queryBaseline) {
        const llmOutcome = await generateQueryBaselineAction(biometrics);
        if (!llmOutcome.success) throw new Error("LLM Generation failed");

        const validatedData = QueryBaselineSchema.parse(llmOutcome.data);

        await setQueryBaselineAction(validatedData);
        await queryClient.invalidateQueries({ 
          queryKey: ['onboarding', session?.user?.id] 
        });
        await update({session})
      }
    } 
    initQueryBaseline()
    }
  , [queryBaseline])

  const createBaselines = async (biometrics, responses, queryBaseline) => {
    return await generateBaselineAction(biometrics, responses, queryBaseline)
  }

  if (queryBaseline && queryGenStatus === "loading") {
    setqueryGenStatus("success")
  }


    const currentMetric = flatMetrics[currentIndex];
    const progress = ((currentIndex + 1) / flatMetrics.length) * 100;

    const handleNext = async () => {
        console.log('currentIndex?', currentIndex)
        if (currentIndex < flatMetrics.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            const result = await createBaselines(biometrics, responses, queryBaseline);
            const baselines = BaselineSchema.parse(result.data)
            console.log('baselines', baselines)
            await setBaselineAction(baselines)
            await update();
        }
    };


  // Helper to get labels based on the specific ICF unit
  const getUnitLabels = (unit: string) => {
    if (unit.toLowerCase().includes("scale")) return ["Severe", "Optimal"];
    if (unit.toLowerCase().includes("ml") || unit.toLowerCase().includes("meters")) return ["Low", "High"];
    return ["Limited", "Full"];
  };

  if (queryGenStatus === "loading") {
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

  // 2. Error State
  if (queryGenStatus === "error") {
    return (
      <Card className="max-w-xl w-full mx-auto m-6 p-8 border-red-100 bg-red-50/30 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <div className="space-y-2">
          <h3 className="font-bold text-red-900">Generation Failed</h3>
          <p className="text-sm text-red-700">We couldn't generate the specific baseline for this procedure. Please try again.</p>
        </div>
      </Card>
    );
  }

  // 3. Empty Data State (LLM returned nothing)
  if (queryGenStatus === "success" && flatMetrics.length === 0) {
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
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                  currentMetric.axis === 'A' ? 'bg-orange-500' : 
                  currentMetric.axis === 'B' ? 'bg-blue-500' : 'bg-emerald-500'
                }`}>
                  AXIS {currentMetric.axis}
                </span>
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