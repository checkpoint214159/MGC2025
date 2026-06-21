"use client";

import { useState, useMemo } from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NutritionPlan } from "@/lib/state/schemas/nutrition";

type Metric = { goal: number; value: number; unit?: string };
type MetricRecord = Record<string, Metric>;
import { updateProgressAction } from "@/lib/actions";
import { NUTRITION_THEMES } from "@/lib/state/ui";
import { useCaregiver } from "@/context/CaregiverContext";
import { Card, Chip, Button, ProgressBar } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

interface Props {
  plan: NutritionPlan;
  trackable: NutritionPlan;
  moduleId: string;
}

export default function NutritionWidget({ plan, trackable, moduleId }: Props) {
  const { meta, data } = plan;
  const type = (meta.type as keyof typeof NUTRITION_THEMES) || "default";
  const theme = NUTRITION_THEMES[type];
  const { isCaregiver } = useCaregiver();

  const trkData = trackable.data as MetricRecord;
  const planData = data as MetricRecord;

  const [localValues, setLocalValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(trkData).map(([k, v]) => [k, v.value || 0]))
  );
  const [status, setStatus] = useState<"idle" | "saving" | "success">("idle");

  const hasChanges = useMemo(
    () => Object.entries(localValues).some(([k, v]) => v !== trkData[k]?.value),
    [localValues, trkData]
  );

  function handleUpdate(key: string, val: number) {
    setLocalValues((p) => ({ ...p, [key]: val }));
    if (status === "success") setStatus("idle");
  }

  async function onSave() {
    setStatus("saving");
    const updated = Object.fromEntries(
      Object.entries(trkData).map(([k, v]) => [k, { ...v, value: localValues[k] }])
    );
    try {
      await updateProgressAction(moduleId, [{ id: trackable.id, data: updated }]);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <h3 className="text-[17px] font-semibold text-ink capitalize">{meta.type || type}</h3>
          <Chip className={theme.chipClass}>{theme.label}</Chip>
        </div>
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.span
              key="ok"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 text-[13px] text-progress font-medium"
            >
              <Check size={14} strokeWidth={2.5} /> Saved
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="space-y-5">
        {Object.entries(planData).map(([key, metric]) => (
          <NutrientRow
            key={key}
            label={key}
            metric={metric}
            value={localValues[key]}
            onUpdate={(v) => handleUpdate(key, v)}
            readOnly={isCaregiver}
          />
        ))}
      </div>

      {isCaregiver ? (
        <p className="border-t border-border pt-3 text-[13px] text-ink-muted">
          Caregiver view — read-only.
        </p>
      ) : (
        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            variant={hasChanges ? "primary" : "secondary"}
            disabled={!hasChanges}
            loading={status === "saving"}
            onClick={onSave}
            size="md"
          >
            {hasChanges ? "Save progress" : "Saved"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function NutrientRow({
  label,
  metric,
  value,
  onUpdate,
  readOnly,
}: {
  label: string;
  metric: Metric;
  value: number;
  onUpdate: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-3 pb-5 border-b border-border last:border-0 last:pb-0">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[13px] font-medium text-ink-muted capitalize">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[22px] font-semibold text-ink tabular-nums">{value}</span>
            <span className="text-[13px] text-ink-subtle">
              / {metric.goal} {metric.unit}
            </span>
          </div>
        </div>
        <Input
          type="number"
          value={value}
          onChange={(e) => onUpdate(Number(e.target.value))}
          disabled={readOnly}
          className="w-24 h-11 text-right tabular-nums"
        />
      </div>

      <ProgressBar value={value} max={metric.goal} tone="progress" size="md" />

      <Slider
        value={[value]}
        max={Math.max(metric.goal * 1.5, 1)}
        step={label.toLowerCase() === "calories" ? 10 : 1}
        onValueChange={(vals) => onUpdate(vals[0])}
        disabled={readOnly}
        className="py-1"
      />
    </div>
  );
}
