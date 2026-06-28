/**
 * Rolling multi-window trend digest (TODO 9.2-B).
 *
 * The two-tier memory captures stable facts (semantic) and a per-phase narrative (episodic),
 * and the heuristic digest captures *today vs baseline*. Neither gives the model a mid-tier,
 * time-bucketed view: "how is this week going vs last week, and over the month?" This pure
 * function aggregates the persisted DailyMetric rows (compliance % + pain, from item 7.5) over
 * sliding windows and emits a compact, labelled block to inject into plan generation.
 *
 * Deterministic and dependency-free (no DB/LLM), unit-testable like lib/engagement. Windows are
 * computed relative to `asOf` (the day being generated), not wall-clock now, so it behaves
 * correctly for back-dated/forward-dated history and tolerates logging gaps.
 */

export type DailyMetricRow = {
    date: Date | string;
    compliancePct: number | null;
    painScore: number | null;
};

const DAY_MS = 86_400_000;

/** Whole-day age of `date` relative to `asOf` (0 = same day, 1 = the day before, …). */
function ageInDays(date: Date | string, asOf: Date): number {
    return Math.floor((asOf.getTime() - new Date(date).getTime()) / DAY_MS);
}

type Stat = { mean: number; n: number } | null;

/** Mean of a metric over rows whose age is in [startDaysAgo, endDaysAgo). Null if no data. */
function windowMean(
    rows: DailyMetricRow[],
    asOf: Date,
    startDaysAgo: number,
    endDaysAgo: number,
    key: "compliancePct" | "painScore",
): Stat {
    const vals: number[] = [];
    for (const r of rows) {
        const age = ageInDays(r.date, asOf);
        if (age < startDaysAgo || age >= endDaysAgo) continue;
        const v = r[key];
        if (typeof v === "number") vals.push(v);
    }
    if (vals.length === 0) return null;
    return {
        mean: vals.reduce((a, b) => a + b, 0) / vals.length,
        n: vals.length,
    };
}

/** ▲ if current is better than prior, ▼ if worse, → if ~flat. `higherIsBetter` flips it. */
function arrow(
    cur: number,
    prior: number,
    higherIsBetter: boolean,
    eps = 0.5,
): string {
    const d = cur - prior;
    if (Math.abs(d) < eps) return "→";
    const better = higherIsBetter ? d > 0 : d < 0;
    return better ? "▲" : "▼";
}

/**
 * Build the rolling-trends block. Returns "" when there's no logged metric data at all (so the
 * caller can simply concatenate it). `asOf` defaults to now but callers should pass the
 * generation date.
 */
export function buildRollingTrends(
    rows: DailyMetricRow[],
    asOf: Date = new Date(),
): string {
    if (!rows || rows.length === 0) return "";

    const c7 = windowMean(rows, asOf, 0, 7, "compliancePct");
    const c14 = windowMean(rows, asOf, 7, 14, "compliancePct");
    const c30 = windowMean(rows, asOf, 0, 30, "compliancePct");
    const p7 = windowMean(rows, asOf, 0, 7, "painScore");
    const p14 = windowMean(rows, asOf, 7, 14, "painScore");
    const p30 = windowMean(rows, asOf, 0, 30, "painScore");

    if (!c7 && !c30 && !p7 && !p30) return ""; // data exists but outside all windows

    const lines: string[] = [];

    if (c7 || c30) {
        let line = "- Compliance:";
        if (c7) {
            line += ` 7d ${Math.round(c7.mean)}% (${c7.n}d logged)`;
            if (c14)
                line += ` ${arrow(c7.mean, c14.mean, true)} from ${Math.round(
                    c14.mean,
                )}% the prior 7d`;
        }
        if (c30) line += `${c7 ? "," : ""} 30d ${Math.round(c30.mean)}%`;
        lines.push(line);
    }

    if (p7 || p30) {
        let line = "- Pain:";
        if (p7) {
            line += ` 7d avg ${p7.mean.toFixed(1)}/10`;
            if (p14)
                line += ` (${arrow(
                    p7.mean,
                    p14.mean,
                    false,
                )} from ${p14.mean.toFixed(1)} the prior 7d)`;
        }
        if (p30) line += `${p7 ? "," : ""} 30d avg ${p30.mean.toFixed(1)}/10`;
        lines.push(line);
    }

    if (lines.length === 0) return "";

    return (
        "ROLLING TRENDS (deterministic, aggregated from logged daily metrics over sliding " +
        "windows — treat as ground truth; use to judge week-over-week direction):\n" +
        lines.join("\n")
    );
}
