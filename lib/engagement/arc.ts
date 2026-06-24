import type { State } from "@/lib/state/schemas/state";

/**
 * Recovery-arc derivation: pure functions over the chain of daily States, used to
 * draw actual-vs-expected on the dashboard and to raise the pain-stagnation flag.
 * Kept dependency-free (no import from ./index) to avoid a circular re-export.
 */

export type DayPain = { day: number; pain: number };
export type ArcPoint = { day: number; actual: number | null; expected: number };
export type ArcResult = {
    points: ArcPoint[];
    deltaToday: number | null;
    onTrack: boolean;
};
export type Stagnation = {
    stalled: boolean;
    window: number;
    from: number | null;
    to: number | null;
};

const PAIN_FLOOR = 1; // pain at/below this is "settled" — never flag.

const recoveryDayOf = (
    dateCreated: Date | string,
    surgeryDate: Date,
): number => {
    const ms = new Date(dateCreated).getTime() - surgeryDate.getTime();
    return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
};

/** Expected pain at a given recovery day: an ease-out decay from baseline → 0 over recoveryDays. */
export function getExpectedRecovery(opts: {
    recoveryDay: number;
    recoveryDays: number;
    baselinePain: number;
}): number {
    const { recoveryDay, recoveryDays, baselinePain } = opts;
    if (recoveryDays <= 1) return 0;
    const t = Math.min(Math.max((recoveryDay - 1) / (recoveryDays - 1), 0), 1);
    const eased = 1 - Math.pow(1 - t, 2); // decelerating: fast early relief, leveling off
    return Math.max(0, baselinePain * (1 - eased));
}

/** Pull the logged pain value (0–10) from a state's symptoms module, or null if absent. */
export function getStatePain(state: State): number | null {
    const sym = state.modules.find((m) => m.type === "symptoms");
    const trackables = (sym?.progress?.trackables ?? []) as Array<{
        data?: Record<string, { value?: number; type?: string }>;
    }>;
    for (const t of trackables) {
        const data = t.data ?? {};
        const entry =
            data.pain ?? Object.values(data).find((m) => m?.type === "pain");
        if (entry && typeof entry.value === "number") return entry.value;
    }
    return null;
}

/** Map the State chain to an ascending {day, pain} series (days with a logged pain only). */
export function getPainSeries(states: State[], surgeryDate: Date): DayPain[] {
    return states
        .map((s) => {
            const pain = getStatePain(s);
            return pain === null
                ? null
                : { day: recoveryDayOf(s.dateCreated, surgeryDate), pain };
        })
        .filter((d): d is DayPain => d !== null)
        .sort((a, b) => a.day - b.day);
}

/** Build the full expected curve and overlay actual pain; report today's delta + on-track. */
export function getActualVsExpected(
    series: DayPain[],
    recoveryDays: number,
    baselinePain: number,
): ArcResult {
    const actualByDay = new Map(series.map((d) => [d.day, d.pain]));
    const points: ArcPoint[] = [];
    for (let day = 1; day <= recoveryDays; day++) {
        points.push({
            day,
            expected: getExpectedRecovery({
                recoveryDay: day,
                recoveryDays,
                baselinePain,
            }),
            actual: actualByDay.get(day) ?? null,
        });
    }
    const today = series.length ? series[series.length - 1] : null;
    const deltaToday = today
        ? today.pain -
          getExpectedRecovery({
              recoveryDay: today.day,
              recoveryDays,
              baselinePain,
          })
        : null;
    const onTrack = deltaToday === null ? true : deltaToday <= 1; // within 1 point of expected
    return { points, deltaToday, onTrack };
}

/** The named flag rule: pain not decreasing over the trailing `window` days while above the floor. */
export function getStagnationSignal(series: DayPain[], window = 3): Stagnation {
    if (series.length < window)
        return { stalled: false, window, from: null, to: null };
    const recent = series.slice(-window);
    const from = recent[0].pain;
    const to = recent[recent.length - 1].pain;
    return { stalled: to > PAIN_FLOOR && to >= from, window, from, to };
}
