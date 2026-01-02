"use client"

import { useState, useMemo } from "react";
import { NutritionPlan } from "@/lib/state/schemas/nutrition";
import { updateProgressAction } from "@/lib/actions";
import { NUTRITION_THEMES } from "@/lib/state/ui";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Save, Loader2 } from "lucide-react"; // Icons for feedback

  const getProgressBarColor = (progress: number) => {
    if (progress < 50) return "#ef4444"; // red-500
    if (progress < 80) return "#f59e0b"; // amber-500
    return "#22c55e"; // green-500
  };

interface NutrientRowProps {
  label: string;
  metric: any;
  value: number;
  onUpdate: (val: number) => void;
}

interface Props {
  plan: NutritionPlan;
  trackable: NutritionPlan;
  moduleId: string;
}

function NutrientRow({ label, metric, value, onUpdate }: NutrientRowProps) {
  const progressPercent = Math.min((value / metric.goal) * 100, 100);
  console.log('progressPercent', progressPercent)
  console.log('color?', getProgressBarColor(progressPercent))
  
  return (
    <div className="space-y-3 pb-6 border-b border-slate-50 last:border-0">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{value}</span>
            <span className="text-slate-400 text-xs font-medium">/ {metric.goal} {metric.unit}</span>
          </div>
        </div>
        
        <Input 
          type="number"
          value={value}
          onChange={(e) => onUpdate(Number(e.target.value))}
          className="w-20 h-8 text-right font-bold bg-slate-50 border-none focus-visible:ring-1"
        />
      </div>

      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <Progress 
          value={progressPercent} 
          className="h-2"
          indicatorColor={getProgressBarColor(progressPercent)} 
        />
      </div>

      <Slider
        value={[value]}
        max={metric.goal * 1.5}
        step={label.toLowerCase() === 'calories' ? 10 : 1}
        onValueChange={(vals) => onUpdate(vals[0])}
        className="py-2"
      />
    </div>
  );
}

export default function NutritionGroupRenderer({ plan, trackable, moduleId }: Props) {
  const { meta, data } = plan;
  const type = (meta.type as keyof typeof NUTRITION_THEMES) || 'default';
  const theme = NUTRITION_THEMES[type];

  const [localValues, setLocalValues] = useState<Record<string, number>>(() => 
    Object.fromEntries(Object.entries(trackable.data).map(([k, v]: [string, any]) => [k, v.value || 0]))
  );
  
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const hasChanges = useMemo(() => 
    Object.entries(localValues).some(([k, v]) => v !== (trackable.data as any)[k]?.value),
    [localValues, trackable.data]
  );

  const handleUpdate = (key: string, newValue: number) => {
    setLocalValues(prev => ({ ...prev, [key]: newValue }));
    if (status === 'success') setStatus('idle');
  };

  async function onSave() {
    setStatus('saving');
    const updatedTrackable = Object.fromEntries(
      Object.entries(trackable.data).map(([k, v]: [string, any]) => [
        k, { ...v, value: localValues[k] }
      ])
    );
    
    try {
      await updateProgressAction(moduleId, 'nutrition', [{ id: trackable.id, data: updatedTrackable }]);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      setStatus('idle');
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Interactive Header */}
      <div className={`p-4 flex items-center justify-between ${theme.bg} border-b border-slate-100`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{theme.icon}</span>
          <h3 className="font-bold text-slate-900 capitalize">{meta.type || type}</h3>
        </div>

        <motion.button
          disabled={!hasChanges || status === 'saving'}
          onClick={onSave}
          initial={false}
          animate={{
            backgroundColor: status === 'success' ? "#22c55e" : hasChanges ? "#0f172a" : "#f1f5f9",
            color: status === 'success' || hasChanges ? "#ffffff" : "#94a3b8",
            scale: status === 'saving' ? 0.98 : 1
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-shadow hover:shadow-md disabled:shadow-none"
        >
          <AnimatePresence mode="wait">
            {status === 'saving' ? (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="w-3 h-3 animate-spin" />
              </motion.div>
            ) : status === 'success' ? (
              <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="w-3 h-3" />
              </motion.div>
            ) : (
              <motion.div key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Save className="w-3 h-3" />
              </motion.div>
            )}
          </AnimatePresence>
          {status === 'success' ? "Saved" : status === 'saving' ? "Saving..." : "Update"}
        </motion.button>
      </div>

      <div className="p-5 space-y-6">
        {Object.entries(data).map(([key, metric]) => (
          <NutrientRow 
            key={key}
            label={key}
            metric={metric}
            value={localValues[key]}
            onUpdate={(val) => handleUpdate(key, val)}
          />
        ))}
      </div>
    </div>
  );
}