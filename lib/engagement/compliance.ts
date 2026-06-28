import type { State } from "@/lib/state/schemas/state";

/**
 * Daily COMPLIANCE: the fraction of goal-bearing tasks the patient completed that day,
 * summed across every module (exercise, nutrition, sleep, symptoms).
 *
 * A "task" is any tracked metric with a positive goal (`goal > 0`). A task counts as
 * complete when its logged `value >= goal`. Symptom metrics have `goal: 0` (you don't
 * "aim" for a pain level), so they contribute zero tasks and drop out naturally — yet we
 * still iterate them, so the definition is genuinely "across all modules" as specced.
 *
 * No per-module weighting yet: every task counts equally (4 goals, 3 done → 75%).
 * Pure and dependency-free, unit-testable like the rest of lib/engagement.
 */

export type DayCompliance = {
    completedTasks: number;
    totalTasks: number;
    /** 0–100, or null when the day had no goal-bearing tasks at all. */
    pct: number | null;
};

type Metric = { goal?: number; value?: number };

function isMetric(v: unknown): v is Metric {
    return (
        typeof v === "object" &&
        v !== null &&
        "goal" in v &&
        typeof (v as Metric).goal === "number"
    );
}

export function getDayCompliance(
    state: State | null | undefined,
): DayCompliance {
    let completedTasks = 0;
    let totalTasks = 0;

    for (const mod of state?.modules ?? []) {
        const trackables = mod.progress?.trackables ?? [];
        for (const t of trackables) {
            for (const metric of Object.values(t.data ?? {})) {
                if (!isMetric(metric)) continue;
                const goal = metric.goal ?? 0;
                if (goal <= 0) continue; // symptoms (goal 0) and untracked metrics excluded
                totalTasks++;
                if ((metric.value ?? 0) >= goal) completedTasks++;
            }
        }
    }

    return {
        completedTasks,
        totalTasks,
        pct:
            totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : null,
    };
}

/**
 * Map a State chain to an ascending {day, progress} compliance series for the flag rules.
 * `day` is the 1-based recovery day; days with no goal-bearing tasks are skipped.
 */
export function getComplianceSeries(
    states: State[],
    surgeryDate: Date,
): { day: number; progress: number }[] {
    return states
        .map((s) => {
            const { pct } = getDayCompliance(s);
            if (pct === null) return null;
            const ms =
                new Date(s.dateCreated).getTime() - surgeryDate.getTime();
            const day = Math.max(1, Math.floor(ms / 86400000) + 1);
            return { day, progress: pct };
        })
        .filter((d): d is { day: number; progress: number } => d !== null)
        .sort((a, b) => a.day - b.day);
}
