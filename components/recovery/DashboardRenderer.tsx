"use client"

import { State } from "@/lib/state/schemas/state";
import ExercisePreviewCard from "@/components/ui/ExercisePreviewCard";
import NutritionPreviewCard from "@/components/ui/NutritionPreviewCard";
import SleepPreviewCard from "@/components/ui/SleepPreviewCard";
import SymptomsPreviewCard from "@/components/ui/SymptomsPreviewCard";

export default function DashboardRenderer({ config }: { config: State | null }) {
  if (!config) {
    return (
      <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
        <p className="text-slate-500 italic">No recovery plan found. Please generate one to begin.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {config.exercise && (
        <ExercisePreviewCard data={config.exercise} />
      )}

      {config.nutrition && (
        <NutritionPreviewCard data={config.nutrition} />
      )}

      {config.sleep && (
        <SleepPreviewCard data={config.sleep} />
      )}

      {config.symptoms && (
        <SymptomsPreviewCard data={config.symptoms} />
      )}
    </div>
  );
}
