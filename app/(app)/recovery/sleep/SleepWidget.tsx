"use client"

import { useState, useMemo } from "react";
import { SleepPlan } from "@/lib/state/schemas/sleep";
import { updateProgressAction } from "@/lib/actions";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { SLEEP_THEME } from "@/lib/state/ui";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Save, Loader2, Moon } from "lucide-react";

interface Props {
  plan: SleepPlan;
  trackable: SleepPlan;
  moduleId: string;
}

export default function SleepWidget({ plan, trackable, moduleId }: Props) {
  const [hoursSlept, setHoursSlept] = useState(trackable.data.hoursSlept.value || 0);
  const [sleepQuality, setSleepQuality] = useState(trackable.data.sleepQuality.value || 0);
  const [disturbances, setDisturbances] = useState(trackable.data.disturbances.value || 0);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const hasChanges = useMemo(() => {
    return (
      hoursSlept !== (trackable.data.hoursSlept.value || 0) ||
      sleepQuality !== (trackable.data.sleepQuality.value || 0) ||
      disturbances !== (trackable.data.disturbances.value || 0)
    );
  }, [hoursSlept, sleepQuality, disturbances, trackable.data]);

  async function handleSave() {
    setStatus('saving');
    const updatedData = {
      hoursSlept: { ...trackable.data.hoursSlept, value: hoursSlept },
      sleepQuality: { ...trackable.data.sleepQuality, value: sleepQuality },
      disturbances: { ...trackable.data.disturbances, value: disturbances },
    };

    try {
      await updateProgressAction(moduleId, 'sleep', [{ id: trackable.id, data: updatedData }]);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('idle');
    }
  }

  const hoursGoal = plan.data.hoursSlept.goal;
  const qualityGoal = plan.data.sleepQuality.goal;
  const hoursPercent = Math.min((hoursSlept / hoursGoal) * 100, 100);
  const qualityPercent = Math.min((sleepQuality / qualityGoal) * 100, 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`p-4 flex items-center justify-between ${SLEEP_THEME.bg} border-b border-slate-100`}>
        <div className="flex items-center gap-2">
          <Moon className={SLEEP_THEME.color} size={20} />
          <h3 className="font-bold text-slate-900">Sleep & Rest</h3>
        </div>
        <motion.button
          disabled={!hasChanges || status === 'saving'}
          onClick={handleSave}
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

      <div className="p-5 space-y-8">
        {/* Hours Slept */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hours Slept</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{hoursSlept}</span>
                <span className="text-slate-400 text-xs font-medium">/ {hoursGoal} hrs</span>
              </div>
            </div>
          </div>
          <Progress value={hoursPercent} className="h-2" indicatorColor={SLEEP_THEME.barColor} />
          <Slider
            value={[hoursSlept]}
            max={12}
            step={0.5}
            onValueChange={(vals) => setHoursSlept(vals[0])}
            className="py-2"
          />
        </div>

        {/* Sleep Quality */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sleep Quality</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{sleepQuality}</span>
                <span className="text-slate-400 text-xs font-medium">/ {qualityGoal}</span>
              </div>
            </div>
          </div>
          <Progress value={qualityPercent} className="h-2" indicatorColor={SLEEP_THEME.barColor} />
          <Slider
            value={[sleepQuality]}
            max={10}
            step={1}
            onValueChange={(vals) => setSleepQuality(vals[0])}
            className="py-2"
          />
        </div>

        {/* Disturbances */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disturbances</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
              <button
                onClick={() => setDisturbances(prev => Math.max(0, prev - 1))}
                className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all text-slate-600"
              >-</button>
              <span className="w-10 text-center text-lg font-black text-slate-900">{disturbances}</span>
              <button
                onClick={() => setDisturbances(prev => prev + 1)}
                className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all text-slate-600"
              >+</button>
            </div>
            <span className="text-xs text-slate-400">times woken up</span>
          </div>
        </div>
      </div>
    </div>
  );
}
