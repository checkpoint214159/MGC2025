"use client";

import { Salad, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, ProgressBar } from "@/components/ui/primitives";
import { NutritionModule } from "@/lib/state/schemas/nutrition";

export default function NutritionPreviewCard({
  data,
  onClick,
}: {
  data: NutritionModule;
  onClick?: () => void;
}) {
  type Macro = { goal?: number; value?: number } | undefined;
  type Macros = Partial<Record<"calories" | "protein" | "carbs" | "fats", Macro>>;

  const macrosPlan = data.plan?.find((p) => p.meta?.type === "macros");
  const macrosProgress = data.progress?.trackables.find((t) => t.id === macrosPlan?.id);
  const planData = (macrosPlan?.data ?? {}) as Macros;
  const progData = (macrosProgress?.data ?? {}) as Macros;

  const cal = { goal: planData.calories?.goal ?? 0, value: progData.calories?.value ?? 0 };
  const protein = { goal: planData.protein?.goal ?? 0, value: progData.protein?.value ?? 0 };
  const carbs = { goal: planData.carbs?.goal ?? 0, value: progData.carbs?.value ?? 0 };
  const fats = { goal: planData.fats?.goal ?? 0, value: progData.fats?.value ?? 0 };

  return (
    <Link href="/recovery/nutrition" onClick={onClick} className="block focus:outline-none">
      <Card interactive className="h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-md bg-progress-soft text-progress-ink grid place-items-center">
              <Salad size={18} strokeWidth={1.75} />
            </div>
            <div className="leading-tight">
              <h3 className="text-[17px] font-semibold text-ink">Nutrition</h3>
              <p className="text-[13px] text-ink-muted">Fueling tissue repair</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink-subtle" strokeWidth={1.75} />
        </div>

        <ProgressBar
          showLabel
          label="Calories"
          value={cal.value}
          max={Math.max(cal.goal, 1)}
          tone="progress"
          size="lg"
        />

        <div className="grid grid-cols-3 gap-3 mt-4">
          <MicroMacro label="Protein" value={protein.value} goal={protein.goal} />
          <MicroMacro label="Carbs" value={carbs.value} goal={carbs.goal} />
          <MicroMacro label="Fats" value={fats.value} goal={fats.goal} />
        </div>
      </Card>
    </Link>
  );
}

function MicroMacro({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] font-medium text-ink-muted">{label}</span>
        <span className="text-[12px] text-ink tabular-nums">
          {Math.round(value)}<span className="text-ink-muted">g</span>
        </span>
      </div>
      <div className="h-1 w-full bg-surface-sunken rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-[width] duration-500 ease-[var(--ease-out-quart)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
