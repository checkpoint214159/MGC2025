"use client";

import { State } from "@/lib/state/schemas/state";
import ExercisePreviewCard from "@/components/ui/ExercisePreviewCard";
import NutritionPreviewCard from "@/components/ui/NutritionPreviewCard";
import { ExerciseModule } from "@/lib/state/schemas/exercise";
import { NutritionModule } from "@/lib/state/schemas/nutrition";

export default function DashboardRenderer({ config }: { config: State | null }) {
  if (!config || config.modules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-sunken/40 p-6">
        <p className="text-[14px] text-ink-muted">Your plan hasn&apos;t been generated yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {config.modules.map((m) => {
        if (m.type === "exercise") {
          return <ExercisePreviewCard key={m.id} data={m as ExerciseModule} />;
        }
        if (m.type === "nutrition") {
          return <NutritionPreviewCard key={m.id} data={m as NutritionModule} />;
        }
        return null;
      })}
    </div>
  );
}
