"use client";

/**
 * A calm "growing plant" that reflects the % of today's tasks done — a nurturing
 * recovery metaphor (not a gamified streak). The plant is revealed from the soil up
 * by progress; a quiet bloom appears once everything's done. Reduced-motion safe
 * (only a width/clip change between renders, no looping animation).
 */
export function DailyPlant({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.max((done / total) * 100, 0), 100) : 0;

  const VW = 120;
  const VH = 150;
  const soilY = 118;
  const topY = 22;
  const revealH = ((soilY - topY) * pct) / 100;
  const clipY = soilY - revealH;

  const msg =
    pct >= 100
      ? "All done today — beautifully tended."
      : pct >= 50
        ? "Coming along nicely."
        : pct > 0
          ? "A good start. One at a time."
          : "Let's tend to today.";

  const leaf = (cx: number, cy: number, rot: number, rx = 14, ry = 6) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="var(--progress-soft)" stroke="var(--progress)" strokeWidth={1.5} />
  );

  return (
    <div className="flex items-center gap-6 rounded-xl border border-border bg-surface p-7 md:p-8">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="h-36 w-auto shrink-0" role="img" aria-label={`${done} of ${total} tasks done today`}>
        <defs>
          <clipPath id="plant-grow">
            <rect x="0" y={clipY} width={VW} height={soilY - clipY} />
          </clipPath>
        </defs>

        {/* pot (always visible) */}
        <path
          d={`M 36 ${soilY} L 40 ${VH - 6} Q 40 ${VH - 2} 44 ${VH - 2} L 76 ${VH - 2} Q 80 ${VH - 2} 80 ${VH - 6} L 84 ${soilY} Z`}
          fill="var(--surface-sunken)"
          stroke="var(--border-strong)"
          strokeWidth={1.5}
        />
        <rect x="33" y={soilY - 7} width="54" height="9" rx="2.5" fill="var(--surface-sunken)" stroke="var(--border-strong)" strokeWidth={1.5} />

        {/* plant, revealed from the soil up */}
        <g clipPath="url(#plant-grow)">
          <path d={`M 60 ${soilY - 7} Q 56 86 60 ${topY + 8}`} fill="none" stroke="var(--progress)" strokeWidth={2.5} strokeLinecap="round" />
          {leaf(46, 96, -32)}
          {leaf(76, 74, 32)}
          {leaf(48, 54, -28, 12, 5)}
        </g>

        {/* bloom once (nearly) everything's done */}
        {pct >= 90 && (
          <g>
            {[0, 72, 144, 216, 288].map((a) => {
              const r = (a * Math.PI) / 180;
              return <circle key={a} cx={60 + Math.cos(r) * 7.5} cy={topY + 2 + Math.sin(r) * 7.5} r={4} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1} />;
            })}
            <circle cx={60} cy={topY + 2} r={4} fill="var(--attention)" />
          </g>
        )}
      </svg>

      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[40px] font-bold leading-none tabular-nums text-ink">{done}</span>
          <span className="text-[16px] text-ink-muted">of {total} today</span>
        </div>
        <p className="mt-1.5 text-[15px] text-ink-muted">{msg}</p>
        <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full rounded-full bg-progress transition-[width] duration-500 ease-[var(--ease-out-quart)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
