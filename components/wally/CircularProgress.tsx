"use client";

/**
 * The dashboard's "% Completed" ring — an SVG donut with a sand track and an accent arc.
 * Pure presentation; the accent picks up the surrounding theme.
 */
export function CircularProgress({
    value,
    size = 116,
    stroke = 11,
    label = "Completed",
}: {
    value: number; // 0–100
    size?: number;
    stroke?: number;
    label?: string;
}) {
    const pct = Math.min(Math.max(value, 0), 100);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - pct / 100);

    return (
        <div className="relative grid place-items-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={stroke} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="var(--progress)"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 600ms var(--ease-out-quart)" }}
                />
            </svg>
            <div className="absolute flex flex-col items-center leading-none">
                <span className="text-[26px] font-bold tabular-nums text-ink">{Math.round(pct)}%</span>
                <span className="mt-0.5 text-[11px] text-ink-muted">{label}</span>
            </div>
        </div>
    );
}
