"use client";

import { Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, Chip, ProgressBar } from "@/components/ui/primitives";
import { ExerciseModule, ExerciseMetrics } from "@/lib/state/schemas/exercise";

export default function ExercisePreviewCard({
  data,
  onClick,
}: {
  data: ExerciseModule;
  onClick?: () => void;
}) {
  const plan = data.plan ?? [];
  const trackables = data.progress?.trackables ?? [];

  let goalTotal = 0;
  let valueTotal = 0;
  plan.forEach((p) => {
    const trk = trackables.find((t) => t.id === p.id);
    const trkData = (trk?.data ?? {}) as Record<string, ExerciseMetrics>;
    Object.entries(p.data ?? {}).forEach(([k, m]) => {
      const metric = m as ExerciseMetrics | undefined;
      goalTotal += metric?.goal ?? 0;
      valueTotal += trkData[k]?.value ?? 0;
    });
  });

  const intensitySet = new Set(plan.map((p) => p.meta?.intensity).filter(Boolean));

  return (
    <Link href="/recovery/exercise" onClick={onClick} className="block focus:outline-none">
      <Card interactive className="h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-md bg-accent-soft text-accent-ink grid place-items-center">
              <Activity size={18} strokeWidth={1.75} />
            </div>
            <div className="leading-tight">
              <h3 className="text-[17px] font-semibold text-ink">Exercise</h3>
              <p className="text-[13px] text-ink-muted">{data.summary ?? "Today's movement"}</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink-subtle" strokeWidth={1.75} />
        </div>

        <ProgressBar
          showLabel
          label={`${plan.length} ${plan.length === 1 ? "movement" : "movements"}`}
          value={valueTotal}
          max={Math.max(goalTotal, 1)}
          tone="progress"
          size="md"
        />

        {intensitySet.size > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Array.from(intensitySet).map((i) => (
              <Chip
                key={i as string}
                tone={i === "red" ? "critical" : i === "orange" ? "attention" : "accent"}
              >
                {i === "red" ? "Pause if pain" : i === "orange" ? "Cautious" : "Easy"}
              </Chip>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}
