"use client";

import { getRecoveryPhase, type RecoveryPhase } from "@/lib/engagement";

/**
 * The signature motif: a quiet recovery arc showing where the patient is across
 * the Early -> Re-engagement -> Late journey. The traveled portion is drawn in
 * accent (exact, via a de Casteljau bezier split), the road ahead in border, and
 * the current day is marked. Phase-aware, calm, color-paired-with-text.
 */
const MAX_DAY = 21;
const PHASES: { key: RecoveryPhase; label: string }[] = [
    { key: "early", label: "Early" },
    { key: "re-engagement", label: "Midway" },
    { key: "late", label: "Later" },
];

type Pt = { x: number; y: number };
const lerp = (a: Pt, b: Pt, s: number): Pt => ({
    x: a.x + (b.x - a.x) * s,
    y: a.y + (b.y - a.y) * s,
});

export function RecoveryArc({ day }: { day: number | null }) {
    const VW = 100;
    const VH = 16;
    const HEIGHT_PX = 56;

    const p0: Pt = { x: 3, y: 13 };
    const ctrl: Pt = { x: 50, y: 11 };
    const p1: Pt = { x: 97, y: 3 };

    const d = Math.min(Math.max(day ?? 1, 1), MAX_DAY);
    const t = (d - 1) / (MAX_DAY - 1);

    // Split the quadratic bezier at t so the traveled sub-curve and the marker align.
    const a = lerp(p0, ctrl, t);
    const b = lerp(ctrl, p1, t);
    const m = lerp(a, b, t);

    const fullD = `M ${p0.x} ${p0.y} Q ${ctrl.x} ${ctrl.y} ${p1.x} ${p1.y}`;
    const traveledD = `M ${p0.x} ${p0.y} Q ${a.x} ${a.y} ${m.x} ${m.y}`;
    const phase = getRecoveryPhase(day);

    return (
        <div>
            <div className="relative w-full" style={{ height: HEIGHT_PX }}>
                <svg
                    viewBox={`0 0 ${VW} ${VH}`}
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                    role="img"
                    aria-label={
                        day
                            ? `Day ${day} of recovery — ${phase.replace(
                                  "-",
                                  " ",
                              )} phase`
                            : "Recovery timeline"
                    }
                >
                    <path
                        d={fullD}
                        fill="none"
                        stroke="var(--border-strong)"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                    <path
                        d={traveledD}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                {day !== null && (
                    <div
                        className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent shadow-sm"
                        style={{
                            left: `${(m.x / VW) * 100}%`,
                            top: `${(m.y / VH) * 100}%`,
                        }}
                        aria-hidden
                    />
                )}
            </div>
            <div className="mt-2.5 flex justify-between text-[13px]">
                {PHASES.map((p) => (
                    <span
                        key={p.key}
                        className={
                            p.key === phase
                                ? "font-semibold text-ink"
                                : "text-ink-muted"
                        }
                    >
                        {p.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
