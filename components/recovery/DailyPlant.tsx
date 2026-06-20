"use client";

import { ReactNode, useState } from "react";

/**
 * A calm "growing coneflower" reflecting % of today's tasks done, in clear stages from
 * seed to bloom. Echinacea: lance leaves, a golden-spiral spiky cone, drooping rose-pink
 * petals. Each bloom is subtly randomised (petal count + pink hue), picked once on mount
 * client-side so SSR markup never differs. Reduced-motion safe.
 */
const VW = 120;
const VH = 150;
const soilY = 116;
const X = 60;

// pointed lance leaf (echinacea), translated + rotated into place
const leaf = (cx: number, cy: number, rot: number, len = 16, w = 5): ReactNode => (
  <path
    d={`M ${-len / 2} 0 Q 0 ${-w / 2} ${len / 2} 0 Q 0 ${w / 2} ${-len / 2} 0 Z`}
    transform={`translate(${cx} ${cy}) rotate(${rot})`}
    fill="var(--progress-soft)"
    stroke="var(--progress)"
    strokeWidth={1.3}
  />
);

function coneflower(cx: number, cy: number, petals: number, hue: number): ReactNode {
  const petalFill = `oklch(0.68 0.14 ${hue})`;
  const petalStroke = `oklch(0.58 0.15 ${hue})`;
  return (
    <g>
      {/* drooping rose-pink ray petals */}
      {Array.from({ length: petals }).map((_, i) => {
        const deg = (360 / petals) * i - 90;
        const a = (deg * Math.PI) / 180;
        const px = cx + Math.cos(a) * 13;
        const py = cy + Math.sin(a) * 13 + 2; // slight downward bias = droop
        return (
          <path
            key={i}
            d="M -8 0 Q 0 -2.4 8 0 Q 0 2.4 -8 0 Z"
            transform={`translate(${px} ${py}) rotate(${deg})`}
            fill={petalFill}
            stroke={petalStroke}
            strokeWidth={0.8}
          />
        );
      })}
      {/* raised copper cone */}
      <ellipse cx={cx} cy={cy - 1} rx={7.5} ry={6.5} fill="oklch(0.5 0.1 58)" stroke="oklch(0.42 0.1 54)" strokeWidth={1} />
      {/* golden-spiral spiky texture */}
      {Array.from({ length: 16 }).map((_, i) => {
        const t = i / 16;
        const ang = i * 137.5 * (Math.PI / 180);
        const rad = 5.5 * Math.sqrt(t);
        return <circle key={`s${i}`} cx={cx + Math.cos(ang) * rad} cy={cy - 1 + Math.sin(ang) * rad * 0.85} r={0.85} fill="oklch(0.74 0.15 70)" />;
      })}
    </g>
  );
}

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
  const [bloom] = useState(() => ({ petals: 12 + Math.floor(Math.random() * 4), hue: 344 + Math.floor(Math.random() * 14) }));

  const msg =
    stage === 6 ? "In full bloom — a coneflower for the whole day." :
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

        {/* stem + lance leaves */}
        {stage >= 1 && (
          <>
            <path d={`M ${X} ${soilY - 6} Q ${X - 4} ${(soilY + top) / 2} ${X} ${top}`} fill="none" stroke="var(--progress)" strokeWidth={2.5} strokeLinecap="round" />
            {stage === 1 && (
              <>
                {leaf(X - 5, top + 2, -45, 8, 3)}
                {leaf(X + 5, top + 2, 45, 8, 3)}
              </>
            )}
            {stage >= 2 && leaf(46, 100, -38, 18, 5)}
            {stage >= 2 && leaf(74, 92, 38, 18, 5)}
            {stage >= 3 && leaf(47, 78, -32, 17, 5)}
            {stage >= 3 && leaf(73, 72, 32, 17, 5)}
            {stage >= 4 && leaf(49, 60, -28, 14, 4)}
            {stage >= 4 && leaf(71, 56, 28, 14, 4)}
          </>
        )}

        {/* bud */}
        {stage === 5 && (
          <path d={`M ${X} ${top} Q ${X - 6} ${top - 9} ${X} ${top - 15} Q ${X + 6} ${top - 9} ${X} ${top}`} fill="var(--progress-soft)" stroke="var(--progress)" strokeWidth={1.5} />
        )}

        {/* coneflower bloom (randomised) */}
        {stage === 6 && coneflower(X, top - 8, bloom.petals, bloom.hue)}
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
