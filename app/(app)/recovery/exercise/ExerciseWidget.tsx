"use client";

import { useState, useMemo } from "react";
import { Minus, Plus, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { ExercisePlan, ExerciseMetrics } from "@/lib/state/schemas/exercise";
import { updateProgressAction } from "@/lib/actions";
import { INTENSITY_THEMES } from "@/lib/state/ui";
import { useCaregiver } from "@/context/CaregiverContext";
import { Button, Chip, ProgressBar, Card } from "@/components/ui/primitives";

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
  isPreview = false,
}: RendererProps) {
  const { meta } = plan;
  const { name, intensity, precaution } = meta;
  const theme = INTENSITY_THEMES[intensity as keyof typeof INTENSITY_THEMES] ?? INTENSITY_THEMES.blue;
  const { isCaregiver } = useCaregiver();

  const trackableId = trackable.id;
  const [localValues, setLocalValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      Object.entries(trackable.data).map(([k, m]: [string, ExerciseMetrics]) => [k, m.value])
    )
  );
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(
    () =>
      Object.entries(localValues).some(([k, v]) => {
        const trkData = trackable.data as Record<string, ExerciseMetrics>;
        return v !== (trkData[k]?.value || 0);
      }),
    [localValues, trackable.data]
  );

  async function handleSave() {
    setIsSaving(true);
    const updated = Object.fromEntries(
      Object.entries(trackable.data).map(([k, m]: [string, ExerciseMetrics]) => [
        k,
        { ...m, value: localValues[k] },
      ])
    );
    const result = await updateProgressAction(moduleId, [{ id: trackableId, data: updated }]);
    if (!result.success) {
      console.error("Save failed:", result.error);
    }
    setIsSaving(false);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h3 className="text-[17px] font-semibold text-ink capitalize leading-tight">{name}</h3>
            <Chip
              tone={intensity === "red" ? "critical" : intensity === "orange" ? "attention" : "accent"}
              size="sm"
            >
              {theme.label}
            </Chip>
          </div>
        </div>

        {!isPreview && theme.showPrecaution && precaution && (
          <div className="flex items-start gap-2.5 rounded-md bg-attention-soft/70 px-3 py-2.5 text-[13px] text-attention-ink">
            <AlertTriangle size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" />
            <p className="leading-snug">{precaution}</p>
          </div>
        )}

        <div className="space-y-5">
          {Object.entries(plan.data).map(([key, metric]: [string, ExerciseMetrics]) => {
            const current = localValues[key] || 0;
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-end justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-ink-muted capitalize">{key}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[24px] font-semibold text-ink tabular-nums">{current}</span>
                      <span className="text-[13px] text-ink-subtle">
                        / {metric.goal} {metric.unit}
                      </span>
                    </div>
                  </div>

                  {!isPreview && !isCaregiver && (
                    <div className="flex items-center gap-1 rounded-md bg-surface-sunken border border-border p-1">
                      <button
                        type="button"
                        onClick={() =>
                          setLocalValues((p) => ({ ...p, [key]: Math.max(0, p[key] - 1) }))
                        }
                        className="size-11 rounded-md grid place-items-center hover:bg-surface text-ink-muted hover:text-ink transition-colors"
                        aria-label={`Decrease ${key}`}
                      >
                        <Minus size={16} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalValues((p) => ({ ...p, [key]: p[key] + 1 }))}
                        className="size-11 rounded-md grid place-items-center hover:bg-surface text-ink-muted hover:text-ink transition-colors"
                        aria-label={`Increase ${key}`}
                      >
                        <Plus size={16} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </div>

                {!isPreview && (
                  <ProgressBar
                    value={current}
                    max={metric.goal}
                    tone="progress"
                    size="md"
                  />
                )}
              </div>
            );
          })}
        </div>

        {!isPreview && !isCaregiver && (
          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              variant={hasChanges ? "primary" : "secondary"}
              disabled={!hasChanges}
              loading={isSaving}
              onClick={handleSave}
              size="md"
            >
              {hasChanges ? "Save progress" : "Saved"}
            </Button>
          </div>
        )}
        {!isPreview && isCaregiver && (
          <p className="border-t border-border pt-3 text-[13px] text-ink-muted">
            Caregiver view — read-only.
          </p>
        )}
      </Card>
    </motion.div>
  );
}
