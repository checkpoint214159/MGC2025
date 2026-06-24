"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { updateProgressAction } from "@/lib/actions";
import { useCaregiver } from "@/context/CaregiverContext";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { SymptomModule } from "@/lib/state/schemas/symptoms";

const SCALE = Array.from({ length: 11 }, (_, i) => i);

/**
 * The keystone daily entry: a single 0–10 pain score written to the symptoms module.
 * This value feeds the recovery arc + progress chart (lib/engagement/arc.ts), so it's
 * the one log that the rest of the hero depends on. Kept deliberately minimal.
 */
export function PainEntry({ module }: { module: SymptomModule }) {
    const { isCaregiver } = useCaregiver();

    // The symptoms blueprint always carries a `pain` metric; find the plan part holding it.
    const planPart =
        module.plan.find((p) => (p.data as Record<string, unknown>)?.pain) ??
        module.plan[0];
    const trackable =
        module.progress?.trackables.find((t) => t.id === planPart?.id) ?? null;
    const painMetric = (
        (trackable?.data ?? planPart?.data) as
            | Record<string, { value?: number }>
            | undefined
    )?.pain;

    const [saved, setSaved] = useState<number>(painMetric?.value ?? 0);
    const [value, setValue] = useState<number>(painMetric?.value ?? 0);
    const [status, setStatus] = useState<"idle" | "saving" | "success">("idle");

    if (!planPart || !trackable || !painMetric) {
        return (
            <p className="text-[14px] text-ink-muted">
                Your daily pain check-in will appear here once your plan
                refreshes.
            </p>
        );
    }

    if (isCaregiver) {
        return (
            <p className="text-[14px] text-ink-muted">
                Today&apos;s pain:{" "}
                <span className="font-medium text-ink">{saved}/10</span>.
                Caregiver view — read-only.
            </p>
        );
    }

    const hasChanges = value !== saved;

    async function onSave() {
        setStatus("saving");
        try {
            const updated = {
                ...trackable!.data,
                pain: { ...painMetric, value },
            };
            await updateProgressAction(module.id, [
                { id: trackable!.id, data: updated },
            ]);
            setSaved(value);
            setStatus("success");
            setTimeout(() => setStatus("idle"), 2500);
        } catch {
            setStatus("idle");
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-[14px] text-ink-muted">
                    Tap the number that fits how you feel right now.
                </p>
                <span className="shrink-0 text-[14px] font-medium text-ink tabular-nums">
                    {value}/10
                </span>
            </div>

            <div
                className="grid grid-cols-6 gap-1.5 sm:grid-cols-11"
                role="group"
                aria-label="Pain level, 0 to 10"
            >
                {SCALE.map((n) => {
                    const active = n === value;
                    return (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setValue(n)}
                            aria-pressed={active}
                            aria-label={`Pain level ${n}`}
                            className={cn(
                                "h-11 rounded-md border text-[15px] font-medium tabular-nums transition-colors",
                                active
                                    ? "border-accent bg-accent text-ink-inverse"
                                    : "border-border bg-surface text-ink-muted hover:bg-surface-sunken hover:text-ink",
                            )}
                        >
                            {n}
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center justify-between gap-3">
                <div className="flex gap-4 text-[12px] text-ink-subtle">
                    <span>0 · None</span>
                    <span>10 · Worst</span>
                </div>
                <div className="flex items-center gap-3">
                    <AnimatePresence>
                        {status === "success" && (
                            <motion.span
                                key="ok"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-progress"
                            >
                                <Check size={14} strokeWidth={2.5} /> Saved
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <Button
                        variant={hasChanges ? "primary" : "secondary"}
                        disabled={!hasChanges}
                        loading={status === "saving"}
                        onClick={onSave}
                        size="md"
                    >
                        {hasChanges ? "Save" : "Saved"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
