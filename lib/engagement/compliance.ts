import type { State } from "@/lib/state/schemas/state";

/**
 * Daily COMPLIANCE across every module (exercise, nutrition, sleep, symptoms).
 *
 * A "task" is any tracked metric with a positive goal (`goal > 0`); symptom metrics have
 * `goal: 0` (you don't "aim" for a pain level) so they drop out naturally.
 *
 * `pct` is GRADED: the mean of each task's fraction toward its goal, capped at 100% per task
 * (`min(value/goal, 1)`). This is what distinguishes a diligent patient who does ~80% of
 * everything (80%) from a reluctant one who does ~30% (30%) — a purely binary "did you hit the
 * goal exactly?" rule collapses both toward 0% and makes them look identical (a real finding
 * from the multi-policy suite, item 10.1). `completedTasks`/`totalTasks` still report the strict
 * count of tasks fully met, for the "how many did you finish outright" view.
 *
 * No per-module weighting yet — every task counts equally. Pure + unit-testable.
 */

export type DayCompliance = {
    completedTasks: number; // tasks where value >= goal (strict/binary)
    totalTasks: number;
    /** GRADED 0–100 (mean of per-task min(value/goal,1)), or null when no goal-bearing tasks. */
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
    let gradedSum = 0;

    for (const mod of state?.modules ?? []) {
        const trackables = mod.progress?.trackables ?? [];
        for (const t of trackables) {
            for (const metric of Object.values(t.data ?? {})) {
                if (!isMetric(metric)) continue;
                const goal = metric.goal ?? 0;
                if (goal <= 0) continue; // symptoms (goal 0) and untracked metrics excluded
                totalTasks++;
                const value = metric.value ?? 0;
                gradedSum += Math.min(value / goal, 1); // cap overshoot at 100% per task
                if (value >= goal) completedTasks++;
            }
        }
    }

    return {
        completedTasks,
        totalTasks,
        pct: totalTasks > 0 ? Math.round((gradedSum / totalTasks) * 100) : null,
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
