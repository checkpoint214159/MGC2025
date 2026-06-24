import type { State } from "@/lib/state/schemas/state";
import {
    getTopPriorities,
    getRecoveryDay,
    getRecoveryPhase,
    getPhaseLabel,
    getStreak,
    getPainSeries,
    type Priority,
    type Streak,
    type DayPain,
} from "@/lib/engagement";

/**
 * Bridges our real persisted `State` chain to the props the recovery widgets expect.
 * Pure and dependency-free (no React, no DB) so it stays unit-testable like the rest
 * of lib/engagement. The widgets were prototyped against fake data in /preview; this
 * is what feeds them production data instead.
 */

// The engagement layer emits placeholder hrefs ("/recovery/exercise"); remap them to
// deep links that open the matching section of the dashboard's inline log accordion.
const HREF_MAP: Record<string, string> = {
    "/recovery/exercise": "/patient/dashboard?log=exercise",
    "/recovery/nutrition": "/patient/dashboard?log=nutrition",
};
const realHref = (h: string): string => HREF_MAP[h] ?? h;

export type RecoveryArcVM = {
    recoveryDays: number;
    baselinePain: number;
    series: DayPain[];
    currentDay: number;
};

export type DashboardVM = {
    recoveryDay: number | null;
    phaseLabel: string;
    priorities: Priority[];
    streak: Streak;
    /** Only present once enough pain has been logged to draw a meaningful curve. */
    arc: RecoveryArcVM | null;
};

export function buildDashboardVM(opts: {
    today: State | null | undefined;
    history: State[];
    surgeryDate: Date | null;
    now?: Date;
}): DashboardVM {
    const now = opts.now ?? new Date();
    const recoveryDay = getRecoveryDay({
        surgeryDate: opts.surgeryDate,
        today: now,
    });
    const phaseLabel = getPhaseLabel(getRecoveryPhase(recoveryDay));

    const priorities = getTopPriorities(opts.today).map((p) => ({
        ...p,
        href: realHref(p.href),
    }));

    // A day counts toward the streak only if it had priorities and all of them were done.
    const streak = getStreak(
        opts.history.map((s) => {
            const ps = getTopPriorities(s, 10);
            return {
                date: new Date(s.dateCreated).toISOString().slice(0, 10),
                allComplete: ps.length > 0 && ps.every((p) => p.isComplete),
            };
        }),
    );

    const arc = buildArc(
        opts.history,
        opts.today,
        opts.surgeryDate,
        recoveryDay,
    );

    return { recoveryDay, phaseLabel, priorities, streak, arc };
}

function buildArc(
    history: State[],
    today: State | null | undefined,
    surgeryDate: Date | null,
    recoveryDay: number | null,
): RecoveryArcVM | null {
    if (!surgeryDate || !recoveryDay) return null;

    const series = getPainSeries(history, surgeryDate);
    const baselinePain = series.length ? series[0].pain : 0;
    const recoveryDays =
        today?.recoveryDays ??
        history.find((s) => s.recoveryDays)?.recoveryDays ??
        0;

    // Need at least two logged pain points and a positive baseline/arc length to mean anything.
    if (series.length < 2 || baselinePain <= 0 || recoveryDays <= 1)
        return null;

    return { recoveryDays, baselinePain, series, currentDay: recoveryDay };
}
