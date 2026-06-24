"use client";

import { useState, type ElementType, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, Utensils, HeartPulse, ChevronDown } from "lucide-react";
import type { State } from "@/lib/state/schemas/state";
import type { ExercisePlan } from "@/lib/state/schemas/exercise";
import type { NutritionPlan } from "@/lib/state/schemas/nutrition";
import { getModuleFromState, cn } from "@/lib/utils";
import { getTopPriorities } from "@/lib/engagement";
import { Chip } from "@/components/ui/primitives";
import { PainEntry } from "./PainEntry";
import RecoveryExerciseRenderer from "./ExerciseWidget";
import NutritionWidget from "./NutritionWidget";

type SectionKey = "pain" | "exercise" | "nutrition";

const isSectionKey = (v: string | null): v is SectionKey =>
    v === "pain" || v === "exercise" || v === "nutrition";

/**
 * The single logging surface. One accordion section per log target (Pain / Exercise /
 * Nutrition), one open at a time. Pain is the pinned keystone (default open); the
 * section can also be opened from a `?log=` deep link (sidebar, nudges). Each section
 * expands to the same widgets the old detail pages rendered — this is what retired
 * DashboardRenderer + the preview-card grid.
 */
export function DailyLog({ state }: { state: State }) {
    const exercise = getModuleFromState(state, "exercise");
    const nutrition = getModuleFromState(state, "nutrition");
    const symptoms = getModuleFromState(state, "symptoms");

    const priorities = getTopPriorities(state, 50);
    const ex = priorities.filter((p) => p.moduleType === "exercise");
    const nu = priorities.filter((p) => p.moduleType === "nutrition");
    const exDone = ex.filter((p) => p.isComplete).length;
    const nuDone = nu.filter((p) => p.isComplete).length;
    // The most urgent open item flags the focus section; pain stays the pinned keystone.
    const focus = priorities.find((p) => !p.isComplete)?.moduleType ?? null;

    const searchParams = useSearchParams();
    const requested = searchParams.get("log");
    const [open, setOpen] = useState<SectionKey | null>(
        isSectionKey(requested) ? requested : "pain",
    );
    // Resync the open section when the ?log= deep link changes (e.g. sidebar/nudge click
    // while already on the dashboard) — the documented "adjust state during render" pattern.
    const [lastRequested, setLastRequested] = useState(requested);
    if (requested !== lastRequested) {
        setLastRequested(requested);
        if (isSectionKey(requested)) setOpen(requested);
    }

    const toggle = (k: SectionKey) => setOpen((cur) => (cur === k ? null : k));

    const sections: {
        key: SectionKey;
        icon: ElementType;
        title: string;
        summary: string;
        chip?: ReactNode;
        content: ReactNode;
    }[] = [
        {
            key: "pain",
            icon: HeartPulse,
            title: "How's your pain today?",
            summary: symptoms
                ? "A quick 0–10 check-in"
                : "Available after your next plan update",
            content: symptoms ? (
                <PainEntry module={symptoms} />
            ) : (
                <p className="text-[14px] text-ink-muted">
                    Your daily pain check-in will appear here once your plan
                    refreshes.
                </p>
            ),
        },
        {
            key: "exercise",
            icon: Activity,
            title: "Exercise",
            summary: ex.length
                ? `${exDone} of ${ex.length} done`
                : "No movements today",
            chip: ex.length ? (
                <Chip
                    tone={exDone === ex.length ? "progress" : "neutral"}
                    size="sm"
                >
                    {exDone === ex.length ? "Done" : `${exDone}/${ex.length}`}
                </Chip>
            ) : null,
            content: exercise?.plan?.length ? (
                <div className="space-y-4">
                    {exercise.plan.map((part: ExercisePlan) => {
                        const trk = exercise.progress?.trackables.find(
                            (t) => t.id === part.id,
                        );
                        if (!trk) return null;
                        return (
                            <RecoveryExerciseRenderer
                                key={part.id}
                                plan={part}
                                trackable={trk}
                                moduleId={exercise.id}
                            />
                        );
                    })}
                </div>
            ) : (
                <p className="text-[14px] text-ink-muted">
                    No exercise plan yet.
                </p>
            ),
        },
        {
            key: "nutrition",
            icon: Utensils,
            title: "Nutrition",
            summary: nu.length
                ? `${nuDone} of ${nu.length} targets met`
                : "No targets today",
            chip: nu.length ? (
                <Chip
                    tone={nuDone === nu.length ? "progress" : "neutral"}
                    size="sm"
                >
                    {nuDone === nu.length ? "Done" : `${nuDone}/${nu.length}`}
                </Chip>
            ) : null,
            content: nutrition?.plan?.length ? (
                <div className="space-y-4">
                    {nutrition.plan.map((part: NutritionPlan) => {
                        const trk = nutrition.progress?.trackables.find(
                            (t) => t.id === part.id,
                        );
                        if (!trk) return null;
                        return (
                            <NutritionWidget
                                key={part.id}
                                plan={part}
                                trackable={trk}
                                moduleId={nutrition.id}
                            />
                        );
                    })}
                </div>
            ) : (
                <p className="text-[14px] text-ink-muted">
                    No nutrition plan yet.
                </p>
            ),
        },
    ];

    return (
        <section className="space-y-3">
            <h2 className="text-[15px] font-semibold text-ink">
                Today&apos;s log
            </h2>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                {sections.map((s) => {
                    const isOpen = open === s.key;
                    const Icon = s.icon;
                    return (
                        <div key={s.key}>
                            <button
                                type="button"
                                onClick={() => toggle(s.key)}
                                aria-expanded={isOpen}
                                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-sunken/50"
                            >
                                <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
                                    <Icon size={18} strokeWidth={1.75} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[15px] font-semibold text-ink">
                                            {s.title}
                                        </span>
                                        {focus === s.key && (
                                            <Chip tone="accent" size="sm">
                                                Focus
                                            </Chip>
                                        )}
                                    </div>
                                    <div className="text-[13px] text-ink-muted">
                                        {s.summary}
                                    </div>
                                </div>
                                {s.chip}
                                <ChevronDown
                                    size={18}
                                    strokeWidth={1.75}
                                    className={cn(
                                        "shrink-0 text-ink-subtle transition-transform",
                                        isOpen && "rotate-180",
                                    )}
                                />
                            </button>
                            {isOpen && (
                                <div className="border-t border-border bg-surface-sunken/40 p-4">
                                    {s.content}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
