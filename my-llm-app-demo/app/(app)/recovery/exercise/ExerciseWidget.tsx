"use client"

import { useState, useMemo } from "react";
import { ExercisePlan, ExerciseMetrics } from "@/lib/state/schema"
import { updateProgressAction } from "@/lib/actions"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion";
import { INTENSITY_THEMES, type Intensity } from "@/lib/state/ui";


interface RendererProps {
  plan: ExercisePlan;
  trackable: ExercisePlan;
  moduleId: string;
  isPreview?: boolean;
}


export default function RecoveryExerciseRenderer({ 
  plan, 
  trackable,
  moduleId,
  isPreview = false 
}: RendererProps) {
  const { id, meta } = plan
  const { name, intensity, precaution } = meta

  const trackableId = trackable.id
  const [localValues, setLocalValues] = useState<Record<string, number>>(() => {
    return Object.fromEntries(
      Object.entries(trackable.data).map(([key, metric]: [string, ExerciseMetrics]) => [key, metric.value || 0])
    );
  });
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return Object.entries(localValues).some(([key, val]) => {
      const original = (trackable.data as any)[key]?.value || 0;
      return val !== original;
    });
  }, [localValues, trackable.data]);

  async function handleSave() {
    // save our localValues to a new trackable
    setIsSaving(true);

    const updatedTrackable = Object.fromEntries(
      Object.entries(trackable.data).map(([key, metric]: [string, ExerciseMetrics]) => [
        key,
        { ...metric, value: localValues[key] }  // replace with localValues
      ])
    );

    const result = await updateProgressAction(moduleId, 'exercise', [
      { 
        id: trackableId, 
        data: updatedTrackable
      }
    ]);
    
    if (!result.success) {
        console.log('error', result.error)
        alert("Failed to save progress. Please check your connection.");
    }
    setIsSaving(false);
  }

  const intensityMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };
  const theme = INTENSITY_THEMES[intensity] || INTENSITY_THEMES.blue;

  const getProgressBarColor = (progress: number) => {
    if (progress < 50) return "#ef4444"; // red-500
    if (progress < 80) return "#f59e0b"; // amber-500
    return "#22c55e"; // green-500
  };

  return (
    <motion.div
      className={`bg-white p-6 rounded-2xl shadow-sm border ${theme.container} space-y-6`}
    >
      {/* Group Header */}
      <div className="flex justify-between items-start gap-4">
      <div className="space-y-1">
        <h3 className="font-bold text-xl text-slate-900 capitalize leading-tight">
          {name}
        </h3>
        
        {/* Conditional Precaution Rendering */}
        {!isPreview && theme.showPrecaution && precaution && (
          <div className={`flex items-start gap-2 p-2.5 rounded-lg border border-transparent ${theme.precautionBg} ${theme.precautionText} text-[11px] leading-relaxed animate-in fade-in slide-in-from-top-1`}>
            <span className="shrink-0">{theme.icon}</span>
            <p>{precaution}</p>
          </div>
        )}
      </div>

    </div>

      {/* List of Exercises in this Widget */}
      <div className="space-y-6">
        {Object.entries(plan.data).map(([key, metric]: [string, ExerciseMetrics]) => {
          const currentLocal = localValues[key] || 0;
          const progressPercent = Math.min((currentLocal / metric.goal) * 100, 100);

          return (
            <div key={key} className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700 capitalize">{key}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">{currentLocal}</span>
                    <span className="text-slate-400 text-xs">/ {metric.goal} {metric.unit}</span>
                  </div>
                </div>

                {/* Micro-controls for this specific exercise */}
                {!isPreview && (
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                    <button 
                      onClick={() => setLocalValues(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}
                      className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all text-slate-600"
                    >-</button>
                    <button 
                      onClick={() => setLocalValues(prev => ({ ...prev, [key]: prev[key] + 1 }))}
                      className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all text-slate-600"
                    >+</button>
                  </div>
                )}
              </div>

              {/* Individual Progress Bar */}
              {!isPreview && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <Progress 
                    value={progressPercent} 
                    className="h-2"
                    indicatorColor={getProgressBarColor(progressPercent)} // Custom prop for dynamic color
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Save for this Widget */}
      {!isPreview && (
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            disabled={!hasChanges || isSaving}
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2
              ${hasChanges 
                ? 'bg-slate-900 text-white shadow-lg hover:bg-slate-800' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            {isSaving && <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />}
            {hasChanges ? 'Update' : 'Synced'}
          </button>
        </div>
      )}
    </motion.div>
  );
}