"use client";

import { ReactNode, useId, useState } from "react";

/**
 * A growing coneflower (Echinacea) reflecting % of today's tasks done, in clear stages
 * from seed to bloom — drawn for realism (tapered shaded stem, veined gradient lance
 * leaves, soil, terracotta pot, a layered cone + drooping rose-pink petals). The bloom
 * is subtly randomised (petal count + pink hue), picked once on mount (SSR-safe).
 */
const VW = 120;
const VH = 150;
const soilY = 116;
const X = 60;

export const STAGE_LABEL = ["seed", "sprout", "seedling", "growing", "leafing out", "budding", "in bloom"];
const STEM_TOP = [110, 100, 88, 74, 62, 56, 54];

export function stageOf(pct: number): number {
  if (pct <= 0) return 0;
  if (pct >= 100) return 6;
  if (pct < 17) return 1;
  if (pct < 34) return 2;
  if (pct < 50) return 3;
  if (pct < 67) return 4;
  return 5;
}

/** The plant SVG only (no card) — reusable so the stage viewer can show every stage. */
export function PlantArt({ stage, petals, hue, className = "h-36 w-auto shrink-0" }: { stage: number; petals: number; hue: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g = (n: string) => `${uid}-${n}`;
  const top = STEM_TOP[Math.min(Math.max(stage, 0), 6)];
  const baseY = soilY - 4;

  // tapered, slightly-leaning filled stem (base half-width 3 → top 1.2)
  const stemD = `M ${X - 3} ${baseY} Q ${X - 6} ${(baseY + top) / 2} ${X - 1.2} ${top} L ${X + 1.2} ${top} Q ${X - 2} ${(baseY + top) / 2} ${X + 3} ${baseY} Z`;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className={className} role="img" aria-label={`Coneflower — ${STAGE_LABEL[stage]}`}>
      <defs>
        <linearGradient id={g("pot")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.66 0.1 48)" />
          <stop offset="1" stopColor="oklch(0.49 0.11 42)" />
        </linearGradient>
        <linearGradient id={g("stem")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.6 0.12 148)" />
          <stop offset="1" stopColor="oklch(0.47 0.13 146)" />
        </linearGradient>
        <linearGradient id={g("leaf")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.57 0.13 148)" />
          <stop offset="1" stopColor="oklch(0.45 0.13 145)" />
        </linearGradient>
        <radialGradient id={g("cone")} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="oklch(0.62 0.12 62)" />
          <stop offset="1" stopColor="oklch(0.38 0.09 50)" />
        </radialGradient>
        <linearGradient id={g("petal")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={`oklch(0.6 0.17 ${hue})`} />
          <stop offset="1" stopColor={`oklch(0.76 0.12 ${hue})`} />
        </linearGradient>
      </defs>

      {/* pot + soil */}
      <path d={`M 35 ${soilY} L 39 ${VH - 6} Q 39 ${VH - 2} 43 ${VH - 2} L 77 ${VH - 2} Q 81 ${VH - 2} 81 ${VH - 6} L 85 ${soilY} Z`} fill={`url(#${g("pot")})`} stroke="oklch(0.43 0.1 40)" strokeWidth={1} />
      <path d={`M 32 ${soilY - 7} L 88 ${soilY - 7} L 85 ${soilY} L 35 ${soilY} Z`} fill="oklch(0.69 0.09 49)" stroke="oklch(0.43 0.1 40)" strokeWidth={1} />
      <ellipse cx={X} cy={soilY - 6} rx={25} ry={3.4} fill="oklch(0.33 0.03 60)" />
      {[[-12, -7], [6, -6], [16, -7], [-2, -5]].map(([dx, dy], i) => (
        <circle key={i} cx={X + dx} cy={soilY + dy} r={0.8} fill="oklch(0.27 0.03 58)" />
      ))}

      {/* seed */}
      {stage === 0 && <ellipse cx={X} cy={soilY - 7} rx={4.5} ry={3} transform={`rotate(-20 ${X} ${soilY - 7})`} fill="oklch(0.45 0.06 60)" stroke="oklch(0.36 0.05 58)" strokeWidth={0.8} />}

      {/* stem + lance leaves */}
      {stage >= 1 && (
        <>
          <path d={stemD} fill={`url(#${g("stem")})`} stroke="oklch(0.42 0.13 145)" strokeWidth={0.6} />
          <path d={`M ${X - 1.4} ${baseY - 2} Q ${X - 4.5} ${(baseY + top) / 2} ${X - 0.6} ${top + 1}`} fill="none" stroke="oklch(0.67 0.1 150)" strokeWidth={0.7} opacity={0.55} />
          {stage === 1 && (
            <>
              <Leaf gid={g("leaf")} cx={X - 5} cy={top + 2} rot={-48} len={9} w={3.4} />
              <Leaf gid={g("leaf")} cx={X + 5} cy={top + 2} rot={48} len={9} w={3.4} />
            </>
          )}
          {stage >= 2 && <Leaf gid={g("leaf")} cx={44} cy={101} rot={-40} len={22} w={6} />}
          {stage >= 2 && <Leaf gid={g("leaf")} cx={76} cy={93} rot={40} len={22} w={6} />}
          {stage >= 3 && <Leaf gid={g("leaf")} cx={46} cy={79} rot={-33} len={19} w={5.4} />}
          {stage >= 3 && <Leaf gid={g("leaf")} cx={74} cy={72} rot={33} len={19} w={5.4} />}
          {stage >= 4 && <Leaf gid={g("leaf")} cx={48} cy={60} rot={-28} len={15} w={4.4} />}
          {stage >= 4 && <Leaf gid={g("leaf")} cx={72} cy={56} rot={28} len={15} w={4.4} />}
        </>
      )}

      {/* bud: green sepals wrapping a hint of cone */}
      {stage === 5 && (
        <g>
          <path d={`M ${X} ${top + 2} Q ${X - 7} ${top - 9} ${X} ${top - 16} Q ${X + 7} ${top - 9} ${X} ${top + 2}`} fill={`url(#${g("leaf")})`} stroke="oklch(0.42 0.13 145)" strokeWidth={0.8} />
          <path d={`M ${X} ${top - 4} Q ${X - 3.5} ${top - 9} ${X} ${top - 13} Q ${X + 3.5} ${top - 9} ${X} ${top - 4}`} fill={`oklch(0.6 0.14 ${hue})`} opacity={0.5} />
        </g>
      )}

      {/* coneflower bloom */}
      {stage === 6 && <Bloom cx={X} cy={top - 8} petals={petals} petalGrad={g("petal")} coneGrad={g("cone")} hue={hue} />}
    </svg>
  );
}

function Leaf({ gid, cx, cy, rot, len, w }: { gid: string; cx: number; cy: number; rot: number; len: number; w: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      {/* petiole back to stem */}
      <path d={`M ${-len / 2} 0 L ${-len / 2 - 3} 0`} stroke="oklch(0.46 0.12 146)" strokeWidth={1.2} strokeLinecap="round" />
      <path d={`M ${-len / 2} 0 Q 0 ${-w / 2} ${len / 2} 0 Q 0 ${w / 2} ${-len / 2} 0 Z`} fill={`url(#${gid})`} stroke="oklch(0.41 0.13 145)" strokeWidth={0.7} />
      <path d={`M ${-len / 2 + 1.5} 0 L ${len / 2 - 1.5} 0`} stroke="oklch(0.44 0.12 145)" strokeWidth={0.6} opacity={0.7} />
      <path d={`M ${-len / 5} 0 L ${len / 5} ${-w / 3.5}`} stroke="oklch(0.44 0.12 145)" strokeWidth={0.4} opacity={0.5} />
      <path d={`M ${-len / 5} 0 L ${len / 5} ${w / 3.5}`} stroke="oklch(0.44 0.12 145)" strokeWidth={0.4} opacity={0.5} />
    </g>
  );
}

function Bloom({ cx, cy, petals, petalGrad, coneGrad, hue }: { cx: number; cy: number; petals: number; petalGrad: string; coneGrad: string; hue: number }): ReactNode {
  const petal = (R: number, scale: number, fill: string, stroke: string, vein: boolean, opacity = 1) =>
    Array.from({ length: petals }).map((_, i) => {
      const deg = (360 / petals) * i - 90;
      const a = (deg * Math.PI) / 180;
      const px = cx + Math.cos(a) * R;
      const py = cy + Math.sin(a) * R + 2; // droop
      const L = 8 * scale;
      return (
        <g key={`${R}-${i}`} transform={`translate(${px} ${py}) rotate(${deg})`} opacity={opacity}>
          <path d={`M ${-L} 0 Q 0 ${-2.4 * scale} ${L} 0 Q 0 ${2.4 * scale} ${-L} 0 Z`} fill={fill} stroke={stroke} strokeWidth={0.7} />
          {vein && <path d={`M ${-L + 1} 0 L ${L - 1.5} 0`} stroke={`oklch(0.55 0.16 ${hue})`} strokeWidth={0.35} opacity={0.55} />}
        </g>
      );
    });

  return (
    <g>
      {/* back row (darker, larger, offset) for depth */}
      {petal(13.5, 1.1, `oklch(0.55 0.16 ${hue})`, `oklch(0.48 0.16 ${hue})`, false, 0.9)}
      {/* front row (gradient + vein) */}
      {petal(12, 1, `url(#${petalGrad})`, `oklch(0.54 0.16 ${hue})`, true)}
      {/* raised copper cone */}
      <ellipse cx={cx} cy={cy - 1} rx={7.5} ry={6.8} fill={`url(#${coneGrad})`} stroke="oklch(0.34 0.08 48)" strokeWidth={1} />
      {Array.from({ length: 18 }).map((_, i) => {
        const t = i / 18;
        const ang = i * 137.5 * (Math.PI / 180);
        const rad = 6 * Math.sqrt(t);
        const sx = cx + Math.cos(ang) * rad;
        const sy = cy - 1 + Math.sin(ang) * rad * 0.82;
        return (
          <g key={`s${i}`}>
            <circle cx={sx} cy={sy} r={1.1} fill="oklch(0.4 0.08 48)" />
            <circle cx={sx - 0.3} cy={sy - 0.3} r={0.5} fill="oklch(0.78 0.15 74)" />
          </g>
        );
      })}
    </g>
  );
}

export function DailyPlant({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.max((done / total) * 100, 0), 100) : 0;
  const stage = stageOf(pct);
  const [bloom] = useState(() => ({ petals: 12 + Math.floor(Math.random() * 4), hue: 344 + Math.floor(Math.random() * 14) }));

  const msg =
    stage === 6 ? "In full bloom — a coneflower for the whole day." :
    stage >= 4 ? "Growing nicely. Keep going." :
    stage >= 1 ? "A good start. One at a time." :
    "Plant today's seed — tap a card to begin.";

  return (
    <div className="flex items-center gap-6 rounded-xl border border-border bg-surface p-7 md:p-8">
      <PlantArt stage={stage} petals={bloom.petals} hue={bloom.hue} />
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
