"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { setInitialPlanAction, getAnchorPlanAction } from "@/lib/actions";
import type {
    InitialPlanInput,
    InitialExerciseTask,
} from "@/lib/state/services/anchor";
import { ensureAction } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Clinician initial-plan upload (working-doc spec): the physio + dietitian set the day-0
 * plan — goals, limits, parameters. Persisted as the ANCHOR state: the human-expert prior
 * Wally generates against, and the reference the plan-distance metric regularizes toward.
 */

const EXERCISE_CATEGORIES = [
    "mobility",
    "resistance",
    "aerobic",
    "stability",
] as const;

const DEFAULT_TASK: InitialExerciseTask = {
    name: "",
    category: "mobility",
    goal: 10,
    unit: "repetitions",
    intensity: "blue",
};

const DEFAULT_FORM: InitialPlanInput = {
    recoveryDays: 30,
    exercise: [
        {
            name: "Deep breathing with support",
            category: "mobility",
            goal: 10,
            unit: "breaths",
            intensity: "blue",
        },
        {
            name: "Short assisted walk",
            category: "aerobic",
            goal: 5,
            unit: "minutes",
            intensity: "blue",
        },
    ],
    nutrition: {
        calories: 1800,
        protein: 90,
        carbs: 200,
        fats: 60,
        hydrationMl: 2000,
    },
    sleep: { hours: 8 },
};

const inputCls =
    "h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring";
const labelCls = "mb-1 block text-xs font-medium text-ink-muted";

export function InitialPlanTab({ patientId }: { patientId: string }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState<InitialPlanInput>(DEFAULT_FORM);

    const { data: anchor, isLoading } = useQuery({
        queryKey: ["admin", "anchor", patientId],
        queryFn: async () => ensureAction(await getAnchorPlanAction(patientId)),
    });

    const submit = useMutation({
        mutationFn: async () =>
            ensureAction(await setInitialPlanAction(patientId, form)),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["admin", "anchor", patientId],
            }),
    });

    const setTask = (i: number, patch: Partial<InitialExerciseTask>) =>
        setForm((f) => ({
            ...f,
            exercise: f.exercise.map((t, j) =>
                j === i ? { ...t, ...patch } : t,
            ),
        }));

    if (isLoading) {
        return (
            <div className="h-64 animate-pulse rounded-lg bg-surface-sunken" />
        );
    }

    return (
        <div className="space-y-6">
            {/* Current anchor status */}
            {anchor ? (
                <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2
                            size={18}
                            strokeWidth={1.75}
                            className="text-progress"
                        />
                        <span className="font-medium text-ink">
                            Anchor plan set
                        </span>
                        <span className="text-ink-muted">
                            {new Date(anchor.dateCreated).toLocaleDateString()}{" "}
                            · {anchor.recoveryDays ?? "?"}-day arc ·{" "}
                            {anchor.modules.length} modules · status{" "}
                            {anchor.status}
                        </span>
                    </div>
                    <p className="mt-2 text-xs text-ink-subtle">
                        Submitting again replaces it (re-anchors the reference
                        Wally regularizes against).
                    </p>
                </Card>
            ) : (
                <Card className="p-4">
                    <p className="text-sm text-ink-muted">
                        No initial plan yet. Set the day-0 plan below — it
                        becomes the expert anchor Wally generates against.
                    </p>
                </Card>
            )}

            {/* Arc length */}
            <Card className="p-5">
                <h3 className="mb-3 font-semibold text-ink">Recovery arc</h3>
                <div className="max-w-[200px]">
                    <label className={labelCls}>Arc length (days)</label>
                    <input
                        type="number"
                        min={7}
                        max={365}
                        className={inputCls}
                        value={form.recoveryDays}
                        onChange={(e) =>
                            setForm((f) => ({
                                ...f,
                                recoveryDays: parseInt(e.target.value) || 30,
                            }))
                        }
                    />
                </div>
            </Card>

            {/* Exercise tasks */}
            <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-ink">
                        Exercise plan{" "}
                        <span className="font-normal text-ink-subtle">
                            (physiotherapist)
                        </span>
                    </h3>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setForm((f) => ({
                                ...f,
                                exercise: [...f.exercise, { ...DEFAULT_TASK }],
                            }))
                        }
                    >
                        <Plus size={14} strokeWidth={1.75} className="mr-1" />
                        Add task
                    </Button>
                </div>
                <div className="space-y-3">
                    {form.exercise.map((t, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-2 items-end gap-3 rounded-md border border-border p-3 md:grid-cols-7"
                        >
                            <div className="col-span-2">
                                <label className={labelCls}>Task</label>
                                <input
                                    className={inputCls}
                                    placeholder="e.g. Ankle pumps"
                                    value={t.name}
                                    onChange={(e) =>
                                        setTask(i, { name: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Category</label>
                                <select
                                    className={inputCls}
                                    value={t.category}
                                    onChange={(e) =>
                                        setTask(i, {
                                            category: e.target.value,
                                        })
                                    }
                                >
                                    {EXERCISE_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Goal</label>
                                <input
                                    type="number"
                                    min={1}
                                    className={inputCls}
                                    value={t.goal}
                                    onChange={(e) =>
                                        setTask(i, {
                                            goal:
                                                parseFloat(e.target.value) || 1,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Unit</label>
                                <input
                                    className={inputCls}
                                    value={t.unit}
                                    onChange={(e) =>
                                        setTask(i, { unit: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Intensity</label>
                                <select
                                    className={inputCls}
                                    value={t.intensity}
                                    onChange={(e) =>
                                        setTask(i, {
                                            intensity: e.target
                                                .value as InitialExerciseTask["intensity"],
                                        })
                                    }
                                >
                                    <option value="blue">blue (low)</option>
                                    <option value="orange">
                                        orange (caution)
                                    </option>
                                    <option value="red">red (careful)</option>
                                </select>
                            </div>
                            <button
                                onClick={() =>
                                    setForm((f) => ({
                                        ...f,
                                        exercise: f.exercise.filter(
                                            (_, j) => j !== i,
                                        ),
                                    }))
                                }
                                className="grid h-11 w-11 place-items-center rounded-md text-ink-subtle hover:bg-surface-sunken hover:text-critical-ink"
                                aria-label="Remove task"
                            >
                                <Trash2 size={16} strokeWidth={1.75} />
                            </button>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Nutrition */}
            <Card className="p-5">
                <h3 className="mb-3 font-semibold text-ink">
                    Nutrition targets{" "}
                    <span className="font-normal text-ink-subtle">
                        (dietitian)
                    </span>
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    {(
                        [
                            ["calories", "Calories (kcal)"],
                            ["protein", "Protein (g)"],
                            ["carbs", "Carbs (g)"],
                            ["fats", "Fats (g)"],
                            ["hydrationMl", "Hydration (ml)"],
                        ] as const
                    ).map(([key, label]) => (
                        <div key={key}>
                            <label className={labelCls}>{label}</label>
                            <input
                                type="number"
                                min={0}
                                className={inputCls}
                                value={form.nutrition[key] ?? 0}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        nutrition: {
                                            ...f.nutrition,
                                            [key]:
                                                parseFloat(e.target.value) || 0,
                                        },
                                    }))
                                }
                            />
                        </div>
                    ))}
                </div>
            </Card>

            {/* Sleep */}
            <Card className="p-5">
                <h3 className="mb-3 font-semibold text-ink">Sleep target</h3>
                <div className="max-w-[200px]">
                    <label className={labelCls}>Hours per night</label>
                    <input
                        type="number"
                        min={4}
                        max={14}
                        step={0.5}
                        className={inputCls}
                        value={form.sleep.hours}
                        onChange={(e) =>
                            setForm((f) => ({
                                ...f,
                                sleep: {
                                    hours: parseFloat(e.target.value) || 8,
                                },
                            }))
                        }
                    />
                </div>
            </Card>

            {/* Submit */}
            <div className="flex items-center gap-4">
                <Button
                    onClick={() => submit.mutate()}
                    disabled={
                        submit.isPending ||
                        form.exercise.length === 0 ||
                        form.exercise.some((t) => !t.name.trim())
                    }
                    isLoading={submit.isPending}
                >
                    {anchor ? "Replace anchor plan" : "Set initial plan"}
                </Button>
                {submit.isSuccess && (
                    <span className="text-sm text-progress-ink">
                        Anchor plan saved.
                    </span>
                )}
                {submit.isError && (
                    <span className="text-sm text-critical-ink">
                        {submit.error?.message}
                    </span>
                )}
            </div>
        </div>
    );
}
