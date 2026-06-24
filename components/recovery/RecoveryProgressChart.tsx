"use client";

import { getActualVsExpected, type DayPain } from "@/lib/engagement";
import { Chip } from "@/components/ui/primitives";

/**
 * The hero visualization (S4): recovery progress over the X-day arc, expected vs actual.
 * Progress = how far pain has fallen from the day-1 baseline toward 0, so the line RISES
 * as the patient recovers. Expected is the planned curve; actual tracks logged pain. A
 * gap below the expected line is what the stagnation flag (S7) catches.
 */
export function RecoveryProgressChart({
    recoveryDays,
    baselinePain,
    series,
    currentDay,
}: {
    recoveryDays: number;
    baselinePain: number;
    series: DayPain[];
    currentDay: number;
}) {
    const { points, onTrack, deltaToday } = getActualVsExpected(
        series,
        recoveryDays,
        baselinePain,
    );
    const toProgress = (pain: number) =>
        baselinePain <= 0 ? 100 : ((baselinePain - pain) / baselinePain) * 100;

    const W = 640;
    const H = 240;
    const padL = 34;
    const padR = 12;
    const padT = 14;
    const padB = 26;
    const x = (day: number) =>
        padL + ((day - 1) / Math.max(recoveryDays - 1, 1)) * (W - padL - padR);
    const y = (progress: number) =>
        padT +
        (1 - Math.min(Math.max(progress, 0), 100) / 100) * (H - padT - padB);

    const line = (pts: { day: number; v: number }[]) =>
        pts
            .map(
                (p, i) =>
                    `${i === 0 ? "M" : "L"} ${x(p.day).toFixed(1)} ${y(
                        p.v,
                    ).toFixed(1)}`,
            )
            .join(" ");

    const expected = points.map((p) => ({
        day: p.day,
        v: toProgress(p.expected),
    }));
    const actual = points
        .filter((p) => p.actual !== null)
        .map((p) => ({ day: p.day, v: toProgress(p.actual as number) }));
    const last = actual[actual.length - 1];

    return (
        <div className="rounded-xl border border-border bg-surface p-7 md:p-8">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-[19px] font-semibold text-ink">
                        Recovery progress
                    </h2>
                    <p className="mt-0.5 text-[14px] text-ink-muted">
                        Day {currentDay} of {recoveryDays} · expected vs. how
                        you&apos;re actually doing
                    </p>
                </div>
                <Chip tone={onTrack ? "progress" : "attention"} size="md">
                    <span
                        className={`size-1.5 rounded-full ${
                            onTrack ? "bg-progress" : "bg-attention"
                        }`}
                    />
                    {onTrack ? "On track" : "Needs attention"}
                </Chip>
            </div>

            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                role="img"
                aria-label={`Recovery progress, day ${currentDay} of ${recoveryDays}, ${
                    onTrack ? "on track" : "needs attention"
                }`}
            >
                {/* gridlines + y labels (0 / 50 / 100%) */}
                {[0, 50, 100].map((g) => (
                    <g key={g}>
                        <line
                            x1={padL}
                            y1={y(g)}
                            x2={W - padR}
                            y2={y(g)}
                            stroke="var(--border)"
                            strokeWidth={1}
                            vectorEffect="non-scaling-stroke"
                        />
                        <text
                            x={padL - 6}
                            y={y(g) + 3}
                            textAnchor="end"
                            className="fill-[var(--ink-subtle)]"
                            style={{ fontSize: 11 }}
                        >
                            {g}%
                        </text>
                    </g>
                ))}
                {/* today vertical marker */}
                <line
                    x1={x(currentDay)}
                    y1={padT}
                    x2={x(currentDay)}
                    y2={H - padB}
                    stroke="var(--border-strong)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    vectorEffect="non-scaling-stroke"
                />
                {/* expected (dashed) */}
                <path
                    d={line(expected)}
                    fill="none"
                    stroke="var(--ink-subtle)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />
                {/* actual (solid accent) */}
                <path
                    d={line(actual)}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
                {/* marker at latest actual */}
                {last && (
                    <circle
                        cx={x(last.day)}
                        cy={y(last.v)}
                        r={4}
                        fill="var(--accent)"
                        stroke="var(--surface)"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                    />
                )}
                {/* x labels */}
                <text
                    x={padL}
                    y={H - 8}
                    textAnchor="start"
                    className="fill-[var(--ink-subtle)]"
                    style={{ fontSize: 11 }}
                >
                    Day 1
                </text>
                <text
                    x={W - padR}
                    y={H - 8}
                    textAnchor="end"
                    className="fill-[var(--ink-subtle)]"
                    style={{ fontSize: 11 }}
                >
                    Day {recoveryDays}
                </text>
            </svg>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                    <span className="h-0.5 w-4 rounded bg-accent" /> Your
                    progress
                </span>
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                    <span className="h-0 w-4 border-t-2 border-dashed border-ink-subtle" />{" "}
                    Expected
                </span>
                {deltaToday !== null && !onTrack && (
                    <span className="text-attention-ink">
                        Pain is running ~{deltaToday.toFixed(1)} above the plan
                        for today.
                    </span>
                )}
            </div>
        </div>
    );
}
