"use client";

import { ReactNode, useState } from "react";

/**
 * A calm "growing plant" reflecting % of today's tasks done, in clear stages from
 * seed to flower. The bloom is randomised (picked once on mount, client-side, so the
 * SSR markup never differs). Reduced-motion safe — only the progress bar transitions.
 */
const VW = 120;
const VH = 150;
const soilY = 116;
const X = 60;

const leaf = (cx: number, cy: number, rot: number, rx = 13, ry = 5.5): ReactNode => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="var(--progress-soft)" stroke="var(--progress)" strokeWidth={1.5} />
);

// Randomised flower variants — each draws petals + a center around (cx, cy).
const FLOWERS: Array<(cx: number, cy: number) => ReactNode> = [
  (cx, cy) => ( // daisy — amber
    <g>
      {Array.from({ length: 11 }).map((_, i) => {
        const deg = (360 / 11) * i;
        const a = (deg * Math.PI) / 180;
        const px = cx + Math.cos(a) * 9;
        const py = cy + Math.sin(a) * 9;
        return <ellipse key={i} cx={px} cy={py} rx={5} ry={2.3} transform={`rotate(${deg} ${px} ${py})`} fill="var(--surface)" stroke="var(--attention)" strokeWidth={1} />;
      })}
      <circle cx={cx} cy={cy} r={4.5} fill="var(--attention)" />
    </g>
  ),
  (cx, cy) => ( // 5-petal blossom — petrol
    <g>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = ((i * 72 - 90) * Math.PI) / 180;
        return <circle key={i} cx={cx + Math.cos(a) * 7} cy={cy + Math.sin(a) * 7} r={5} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1} />;
      })}
      <circle cx={cx} cy={cy} r={3.5} fill="var(--accent)" />
    </g>
  ),
  (cx, cy) => ( // rose cluster — warm
    <g>
      <circle cx={cx} cy={cy} r={9} fill="var(--critical-soft)" stroke="var(--critical)" strokeWidth={1} />
      <circle cx={cx - 2.5} cy={cy - 1} r={4.5} fill="none" stroke="var(--critical)" strokeWidth={1} opacity={0.6} />
      <circle cx={cx + 1.5} cy={cy + 1.5} r={2.5} fill="var(--critical)" opacity={0.5} />
    </g>
  ),
  (cx, cy) => ( // sunflower — amber
    <g>
      {Array.from({ length: 13 }).map((_, i) => {
        const deg = (360 / 13) * i;
        const a = (deg * Math.PI) / 180;
        const px = cx + Math.cos(a) * 9;
        const py = cy + Math.sin(a) * 9;
        return <ellipse key={i} cx={px} cy={py} rx={4.5} ry={2} transform={`rotate(${deg} ${px} ${py})`} fill="var(--attention-soft)" stroke="var(--attention)" strokeWidth={0.8} />;
      })}
      <circle cx={cx} cy={cy} r={5.5} fill="var(--attention-ink)" />
    </g>
  ),
  (cx, cy) => ( // 6-petal duotone
    <g>
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        const px = cx + Math.cos(a) * 7;
        const py = cy + Math.sin(a) * 7;
        const even = i % 2 === 0;
        return <ellipse key={i} cx={px} cy={py} rx={5.5} ry={3} transform={`rotate(${i * 60} ${px} ${py})`} fill={even ? "var(--accent-soft)" : "var(--attention-soft)"} stroke={even ? "var(--accent)" : "var(--attention)"} strokeWidth={0.8} />;
      })}
      <circle cx={cx} cy={cy} r={3.5} fill="var(--accent)" />
    </g>
  ),
];

const STAGE_LABEL = ["seed", "sprout", "seedling", "growing", "leafing out", "budding", "in bloom"];
const STEM_TOP = [110, 100, 88, 74, 62, 56, 54];

function stageOf(pct: number): number {
  if (pct <= 0) return 0;
  if (pct >= 100) return 6;
  if (pct < 17) return 1;
  if (pct < 34) return 2;
  if (pct < 50) return 3;
  if (pct < 67) return 4;
  return 5;
}

export function DailyPlant({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.max((done / total) * 100, 0), 100) : 0;
  const stage = stageOf(pct);
  const top = STEM_TOP[stage];
  const [flowerIdx] = useState(() => Math.floor(Math.random() * FLOWERS.length));

  const msg =
    stage === 6 ? "In full bloom — every task done today." :
    stage >= 4 ? "Growing nicely. Keep going." :
    stage >= 1 ? "A good start. One at a time." :
    "Plant today's seed — tap a card to begin.";

  return (
    <div className="flex items-center gap-6 rounded-xl border border-border bg-surface p-7 md:p-8">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="h-36 w-auto shrink-0" role="img" aria-label={`${done} of ${total} tasks done today — ${STAGE_LABEL[stage]}`}>
        {/* pot */}
        <path d={`M 36 ${soilY} L 40 ${VH - 6} Q 40 ${VH - 2} 44 ${VH - 2} L 76 ${VH - 2} Q 80 ${VH - 2} 80 ${VH - 6} L 84 ${soilY} Z`} fill="var(--surface-sunken)" stroke="var(--border-strong)" strokeWidth={1.5} />
        <rect x="33" y={soilY - 7} width="54" height="9" rx="2.5" fill="var(--surface-sunken)" stroke="var(--border-strong)" strokeWidth={1.5} />

        {/* seed */}
        {stage === 0 && <ellipse cx={X} cy={soilY - 3} rx={5} ry={3.5} transform={`rotate(-20 ${X} ${soilY - 3})`} fill="var(--ink-subtle)" />}

        {/* stem + leaves */}
        {stage >= 1 && (
          <>
            <path d={`M ${X} ${soilY - 6} Q ${X - 4} ${(soilY + top) / 2} ${X} ${top}`} fill="none" stroke="var(--progress)" strokeWidth={2.5} strokeLinecap="round" />
            {stage === 1 && (
              <>
                {leaf(X - 5, top + 2, -45, 6, 3)}
                {leaf(X + 5, top + 2, 45, 6, 3)}
              </>
            )}
            {stage >= 2 && leaf(48, 100, -36)}
            {stage >= 2 && leaf(72, 92, 36)}
            {stage >= 3 && leaf(48, 78, -30)}
            {stage >= 3 && leaf(72, 72, 30)}
            {stage >= 4 && leaf(50, 60, -26, 11, 4.5)}
            {stage >= 4 && leaf(70, 56, 26, 11, 4.5)}
          </>
        )}

        {/* bud */}
        {stage === 5 && (
          <path d={`M ${X} ${top} Q ${X - 6} ${top - 9} ${X} ${top - 15} Q ${X + 6} ${top - 9} ${X} ${top}`} fill="var(--progress-soft)" stroke="var(--progress)" strokeWidth={1.5} />
        )}

        {/* flower (randomised) */}
        {stage === 6 && FLOWERS[flowerIdx](X, top - 7)}
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
