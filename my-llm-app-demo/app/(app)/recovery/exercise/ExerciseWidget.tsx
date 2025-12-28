"use client"

import {useState} from "react";
import { ExerciseTarget } from "@/lib/state/schema"
import {updateTaskAction} from "@/lib/actions"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion";

interface RendererProps {
  task: ExerciseTarget;
  currentValue: number;
  isPreview?: boolean;
}


export default function RecoveryExerciseRenderer({ 
  task, 
  currentValue,
  isPreview = false 
}: RendererProps) {
  const { id, props } = task;
  const { name, goal, intensity, unit, precaution } = props;
  
  const [localValue, setLocalValue] = useState(Number(currentValue) || 0);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = localValue !== currentValue;

  async function handleSave() {
    setIsSaving(true);
    const result = await updateTaskAction(task.id, localValue, 'exercise'); // oh yeah hardcoding
    
    if (!result.success) {
        alert("Failed to save progress. Please check your connection.");
    }
    setIsSaving(false);
  }

  const intensityMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };
  const intensityColor = intensityMap[intensity] || "bg-gray-100 text-gray-700";

  const progressPercent = Math.min((localValue / goal) * 100, 100);
  const getProgressBarColor = (progress: number) => {
    if (progress < 50) return "#ef4444"; // red-500
    if (progress < 80) return "#f59e0b"; // amber-500
    return "#22c55e"; // green-500
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-6 rounded-lg shadow-md border border-gray-100 space-y-6"
    >
        
        {/* Header with Title and Counter */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg text-slate-900 leading-tight">{name}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{localValue}</span>
              <span className="text-slate-400 font-medium text-sm">/ {goal} {unit}</span>
            </div>
          </div>
          
          {/* Intensity Badge */}
          {!isPreview && (
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${intensityColor}`}>
              {intensity}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {!isPreview && (
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-5">
            <Progress 
              value={progressPercent} 
              className="h-2"
              indicatorColor={getProgressBarColor(progressPercent)} // Custom prop for dynamic color
            />
          </div>
        )}

        {!isPreview ? (
          <div className="space-y-4">
            {/* Precaution Note */}
            <div className="flex items-start gap-3 text-amber-800 bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-xs">
              <span>⚠️</span>
              <span><strong className="font-bold">Precaution:</strong> {precaution}</span>
            </div>

            {/* Controls Footer */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              {/* Increment/Decrement Buttons */}
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-full border border-slate-100">
                <button 
                  onClick={() => setLocalValue(Math.max(0, localValue - 1))}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all text-slate-600 font-bold"
                >-</button>
                
                <button 
                  onClick={() => setLocalValue(localValue + 1)}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all text-slate-600 font-bold"
                >+</button>
              </div>

              {/* Universal Save Button */}
              <button
                disabled={!hasChanges || isSaving}
                onClick={handleSave}
                className={`px-5 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2
                  ${hasChanges 
                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                {isSaving ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : null}
                {hasChanges ? 'Save Progress' : 'Saved'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-blue-600 text-[10px] font-bold uppercase tracking-widest flex items-center">
            Tap to start session <span className="ml-1">→</span>
          </div>
        )}
    </motion.div>
  );
}