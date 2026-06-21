"use client";

import { ReactNode, useId, useState } from "react";

/**
 * A growing potted flower reflecting % of today's tasks done, in clear stages from seed
 * to bloom. Styled after focus apps like Forest: flat, friendly, symmetric — a soft
 * backdrop "coin", a chunky clay pot, lush two-tone leaves, and a cheerful rounded bloom.
 * The species (one of six) + petal count are picked once on mount (SSR-safe), so each
 * day's plant is a small surprise.
 */
const VW = 120;
const VH = 140;
const X = 60; // central axis
const SOIL = 104; // soil surface y

export const STAGE_LABEL = ["seed", "sprout", "seedling", "growing", "leafing out", "budding", "in bloom"];
// y of the growing tip per stage (taller as it grows)
const STEM_TOP = [SOIL, 92, 80, 64, 52, 46, 46];

export function stageOf(pct: number): number {
  if (pct <= 0) return 0;
  if (pct >= 100) return 6;
  if (pct < 17) return 1;
  if (pct < 34) return 2;
  if (pct < 50) return 3;
  if (pct < 67) return 4;
  return 5;
}

// ── small drawing helpers ───────────────────────────────────────────────────
/** A ring of rounded petal ellipses radiating from a centre. */
function petalRing(cx: number, cy: number, n: number, R: number, rx: number, ry: number, fill: string, stroke: string, droop = 0) {
  return Array.from({ length: n }).map((_, i) => {
    const deg = (360 / n) * i - 90;
    const a = (deg * Math.PI) / 180;
    const px = cx + Math.cos(a) * R;
    const py = cy + Math.sin(a) * R + droop;
    return <ellipse key={`${R}-${i}`} cx={px} cy={py} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={0.7} transform={`rotate(${deg} ${px} ${py})`} />;
  });
}

/** A golden-angle scatter of seed dots for a flower centre. */
function seedDots(cx: number, cy: number, n: number, spread: number, color: string, hi: string) {
  return Array.from({ length: n }).map((_, i) => {
    const t = i / n;
    const ang = i * 137.5 * (Math.PI / 180);
    const rad = spread * Math.sqrt(t);
    const sx = cx + Math.cos(ang) * rad;
    const sy = cy + Math.sin(ang) * rad;
    return (
      <g key={`s${i}`}>
        <circle cx={sx} cy={sy} r={1} fill={color} />
        <circle cx={sx - 0.3} cy={sy - 0.3} r={0.45} fill={hi} />
      </g>
    );
  });
}

// ── the six flower species ──────────────────────────────────────────────────
type BloomCtx = { petals: number; g: (n: string) => string };
type Species = {
  id: string;
  label: string;
  tip: string; // colour peeking from the bud at stage 5
  petalRange: [number, number];
  bloom: (cx: number, cy: number, ctx: BloomCtx) => ReactNode;
};

const coneflower: Species = {
  id: "coneflower",
  label: "Coneflower",
  tip: "oklch(0.7 0.14 348)",
  petalRange: [13, 16],
  bloom: (cx, cy, { petals, g }) => (
    <g>
      {petalRing(cx, cy, petals, 11, 7, 3, "oklch(0.6 0.16 348)", "oklch(0.54 0.16 348)", 1.5)}
      {petalRing(cx, cy, petals, 10, 6.5, 2.7, "oklch(0.74 0.13 348)", "oklch(0.6 0.16 348)", 1)}
      <circle cx={cx} cy={cy} r={7.2} fill={`url(#${g("cone")})`} stroke="oklch(0.36 0.08 50)" strokeWidth={1} />
      {seedDots(cx, cy, 16, 5.6, "oklch(0.43 0.09 50)", "oklch(0.85 0.14 82)")}
    </g>
  ),
};

const daisy: Species = {
  id: "daisy",
  label: "Daisy",
  tip: "oklch(0.95 0.02 95)",
  petalRange: [12, 14],
  bloom: (cx, cy, { petals, g }) => (
    <g>
      {petalRing(cx, cy, petals, 10.5, 7, 2.7, "oklch(0.9 0.025 95)", "oklch(0.8 0.03 95)", 0.5)}
      {petalRing(cx, cy, petals, 10, 6.5, 2.4, "oklch(0.98 0.012 95)", "oklch(0.84 0.025 95)", 0)}
      <circle cx={cx} cy={cy} r={5.4} fill={`url(#${g("yolk")})`} stroke="oklch(0.66 0.13 80)" strokeWidth={0.8} />
      {seedDots(cx, cy, 10, 3.6, "oklch(0.68 0.14 78)", "oklch(0.92 0.13 92)")}
    </g>
  ),
};

const sunflower: Species = {
  id: "sunflower",
  label: "Sunflower",
  tip: "oklch(0.8 0.15 82)",
  petalRange: [17, 20],
  bloom: (cx, cy, { petals, g }) => (
    <g>
      {petalRing(cx, cy, petals, 11, 7, 2.6, "oklch(0.72 0.16 76)", "oklch(0.62 0.16 72)", 1.2)}
      {petalRing(cx, cy, petals, 10, 6.5, 2.4, "oklch(0.82 0.16 84)", "oklch(0.68 0.16 76)", 0.5)}
      <circle cx={cx} cy={cy} r={8} fill={`url(#${g("sun")})`} stroke="oklch(0.3 0.05 55)" strokeWidth={1} />
      {seedDots(cx, cy, 22, 6.3, "oklch(0.32 0.05 55)", "oklch(0.55 0.08 60)")}
    </g>
  ),
};

const tulip: Species = {
  id: "tulip",
  label: "Tulip",
  tip: "oklch(0.62 0.2 22)",
  petalRange: [3, 3],
  bloom: (cx, cy) => {
    const b = cy + 11; // narrow base, sitting on the stem
    return (
      <g>
        {/* outer side petals */}
        <path d={`M ${cx} ${b} C ${cx - 12} ${cy + 5} ${cx - 11} ${cy - 10} ${cx - 3} ${cy - 11} C ${cx - 2} ${cy - 2} ${cx} ${cy + 3} ${cx} ${b} Z`} fill="oklch(0.58 0.2 24)" stroke="oklch(0.5 0.2 24)" strokeWidth={0.7} />
        <path d={`M ${cx} ${b} C ${cx + 12} ${cy + 5} ${cx + 11} ${cy - 10} ${cx + 3} ${cy - 11} C ${cx + 2} ${cy - 2} ${cx} ${cy + 3} ${cx} ${b} Z`} fill="oklch(0.58 0.2 24)" stroke="oklch(0.5 0.2 24)" strokeWidth={0.7} />
        {/* front centre petal */}
        <path d={`M ${cx} ${b} C ${cx - 6} ${cy + 2} ${cx - 5.5} ${cy - 12} ${cx} ${cy - 13} C ${cx + 5.5} ${cy - 12} ${cx + 6} ${cy + 2} ${cx} ${b} Z`} fill="oklch(0.66 0.21 26)" stroke="oklch(0.52 0.2 24)" strokeWidth={0.7} />
        <path d={`M ${cx} ${cy - 9} L ${cx} ${cy + 6}`} stroke="oklch(0.54 0.2 24)" strokeWidth={0.6} opacity={0.5} />
      </g>
    );
  },
};

const rose: Species = {
  id: "rose",
  label: "Rose",
  tip: "oklch(0.62 0.18 8)",
  petalRange: [7, 8],
  bloom: (cx, cy, { petals }) => (
    <g>
      {/* outer fuller petals */}
      {petalRing(cx, cy, petals, 8, 5.2, 4.4, "oklch(0.58 0.18 10)", "oklch(0.5 0.18 10)", 0)}
      {/* inner ring, offset */}
      {petalRing(cx, cy + 0.5, Math.max(5, petals - 2), 4.4, 4, 3.4, "oklch(0.68 0.17 8)", "oklch(0.56 0.18 10)", 0)}
      {/* coiled centre */}
      <circle cx={cx} cy={cy} r={3.4} fill="oklch(0.74 0.15 8)" stroke="oklch(0.58 0.18 10)" strokeWidth={0.6} />
      <path d={`M ${cx} ${cy} m -2.4 0 a 2.4 2.4 0 1 1 4.8 0.6 a 1.5 1.5 0 1 1 -3 -0.2`} fill="none" stroke="oklch(0.52 0.18 10)" strokeWidth={0.7} />
    </g>
  ),
};

const poppy: Species = {
  id: "poppy",
  label: "Poppy",
  tip: "oklch(0.64 0.21 38)",
  petalRange: [5, 6],
  bloom: (cx, cy, { petals }) => (
    <g>
      {petalRing(cx, cy, petals, 6, 8.5, 6.5, "oklch(0.58 0.21 36)", "oklch(0.5 0.21 34)", 0.5)}
      {petalRing(cx, cy, petals, 5, 7.5, 5.5, "oklch(0.68 0.21 40)", "oklch(0.56 0.21 36)", 0)}
      <circle cx={cx} cy={cy} r={3.2} fill="oklch(0.28 0.05 60)" />
      {petalRing(cx, cy, 8, 3.4, 0.7, 1.4, "oklch(0.2 0.03 60)", "oklch(0.2 0.03 60)", 0)}
    </g>
  ),
};

const SPECIES: Record<string, Species> = { coneflower, daisy, sunflower, tulip, rose, poppy };
export const SPECIES_IDS = Object.keys(SPECIES);

/** The plant SVG only (no card) — reusable so the stage/variety viewers can show any combination. */
export function PlantArt({ stage, species = "coneflower", petals, className = "h-36 w-auto shrink-0" }: { stage: number; species?: string; petals: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g = (n: string) => `${uid}-${n}`;
  const top = STEM_TOP[Math.min(Math.max(stage, 0), 6)];
  const sp = SPECIES[species] ?? coneflower;

  // slightly tapered, perky filled stem (base half-width 2.6 → top 1.3) with a rounded tip
  const stemD = `M ${X - 2.6} ${SOIL} L ${X - 1.3} ${top + 2} Q ${X} ${top} ${X + 1.3} ${top + 2} L ${X + 2.6} ${SOIL} Z`;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className={className} role="img" aria-label={`${sp.label} — ${STAGE_LABEL[stage]}`}>
      <defs>
        <radialGradient id={g("coin")} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="oklch(0.97 0.025 150)" />
          <stop offset="1" stopColor="oklch(0.93 0.04 150)" />
        </radialGradient>
        <radialGradient id={g("cone")} cx="0.4" cy="0.34" r="0.78">
          <stop offset="0" stopColor="oklch(0.74 0.13 70)" />
          <stop offset="1" stopColor="oklch(0.5 0.1 52)" />
        </radialGradient>
        <radialGradient id={g("yolk")} cx="0.4" cy="0.34" r="0.8">
          <stop offset="0" stopColor="oklch(0.9 0.15 92)" />
          <stop offset="1" stopColor="oklch(0.74 0.15 80)" />
        </radialGradient>
        <radialGradient id={g("sun")} cx="0.4" cy="0.34" r="0.82">
          <stop offset="0" stopColor="oklch(0.5 0.08 60)" />
          <stop offset="1" stopColor="oklch(0.3 0.05 52)" />
        </radialGradient>
      </defs>

      {/* soft backdrop coin */}
      <circle cx={X} cy={64} r={56} fill={`url(#${g("coin")})`} />

      {/* ground shadow under the pot */}
      <ellipse cx={X} cy={SOIL + 30} rx={28} ry={4} fill="oklch(0.55 0.03 150)" opacity={0.18} />

      {/* pot — chunky, rounded, flat two-tone clay */}
      <path d={`M 37 ${SOIL} L 41 ${SOIL + 26} Q 41.5 ${SOIL + 31} 47 ${SOIL + 31} L 73 ${SOIL + 31} Q 78.5 ${SOIL + 31} 79 ${SOIL + 26} L 83 ${SOIL} Z`} fill="oklch(0.66 0.1 48)" />
      <path d={`M 60 ${SOIL} L 60 ${SOIL + 31} L 73 ${SOIL + 31} Q 78.5 ${SOIL + 31} 79 ${SOIL + 26} L 83 ${SOIL} Z`} fill="oklch(0.6 0.105 45)" />
      {/* pot rim */}
      <rect x={33} y={SOIL - 8} width={54} height={9} rx={3.5} fill="oklch(0.7 0.095 50)" />
      <rect x={60} y={SOIL - 8} width={27} height={9} fill="oklch(0.64 0.1 47)" />
      {/* soil cap */}
      <path d={`M 35.5 ${SOIL - 1} Q ${X} ${SOIL - 6} 84.5 ${SOIL - 1} L 84.5 ${SOIL} L 35.5 ${SOIL} Z`} fill="oklch(0.42 0.045 62)" />
      {[[-13, -1.5], [-4, -3], [7, -2.5], [15, -1]].map(([dx, dy], i) => (
        <circle key={i} cx={X + dx} cy={SOIL - 2 + dy} r={0.9} fill="oklch(0.34 0.04 60)" />
      ))}

      {/* seed nestled in the soil */}
      {stage === 0 && (
        <ellipse cx={X} cy={SOIL - 3.5} rx={4.5} ry={3} transform={`rotate(-18 ${X} ${SOIL - 3.5})`} fill="oklch(0.48 0.06 62)" stroke="oklch(0.38 0.05 60)" strokeWidth={0.8} />
      )}

      {/* stem */}
      {stage >= 1 && <path d={stemD} fill="oklch(0.56 0.13 148)" />}

      {/* leaves — flat two-tone, symmetric, perky; fuller as it grows */}
      {stage === 1 && (
        <>
          <Leaf x={X} y={top + 3} dir={-1} up={18} len={9} w={4} />
          <Leaf x={X} y={top + 3} dir={1} up={18} len={9} w={4} />
        </>
      )}
      {stage >= 2 && (
        <>
          <Leaf x={X} y={SOIL - 8} dir={-1} up={26} len={22} w={9} />
          <Leaf x={X} y={SOIL - 8} dir={1} up={26} len={22} w={9} />
        </>
      )}
      {stage >= 3 && (
        <>
          <Leaf x={X} y={SOIL - 26} dir={-1} up={34} len={19} w={7.5} />
          <Leaf x={X} y={SOIL - 26} dir={1} up={34} len={19} w={7.5} />
        </>
      )}
      {stage >= 4 && (
        <>
          <Leaf x={X} y={SOIL - 42} dir={-1} up={42} len={15} w={6} />
          <Leaf x={X} y={SOIL - 42} dir={1} up={42} len={15} w={6} />
        </>
      )}

      {/* bud — green sepals cupping a hint of the flower's colour */}
      {stage === 5 && (
        <g>
          <path d={`M ${X} ${top + 4} Q ${X - 7} ${top - 6} ${X} ${top - 14} Q ${X + 7} ${top - 6} ${X} ${top + 4} Z`} fill="oklch(0.56 0.14 148)" />
          <path d={`M ${X} ${top - 14} Q ${X - 4} ${top - 9} ${X} ${top - 2} Q ${X + 4} ${top - 9} ${X} ${top - 14} Z`} fill={sp.tip} />
        </g>
      )}

      {/* bloom */}
      {stage === 6 && sp.bloom(X, top - 4, { petals, g })}
    </svg>
  );
}

/** A flat, two-tone leaf: lighter upper half + darker lower half split along the midrib. */
function Leaf({ x, y, dir, up, len, w }: { x: number; y: number; dir: -1 | 1; up: number; len: number; w: number }) {
  // dir +1 → points up-right (rot -up); dir -1 → points up-left (rot up-180)
  const rot = dir > 0 ? -up : up - 180;
  const tipCtl = len * 0.55;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {/* lower (darker) half */}
      <path d={`M 0 0 C ${len * 0.06} ${w} ${tipCtl} ${w} ${len} 0 Z`} fill="oklch(0.5 0.14 147)" />
      {/* upper (lighter) half */}
      <path d={`M 0 0 C ${len * 0.06} ${-w} ${tipCtl} ${-w} ${len} 0 Z`} fill="oklch(0.66 0.14 150)" />
      {/* midrib */}
      <path d={`M 1.5 0 L ${len - 1.5} 0`} stroke="oklch(0.46 0.13 146)" strokeWidth={0.7} strokeLinecap="round" opacity={0.7} />
      {/* outline */}
      <path d={`M 0 0 C ${len * 0.06} ${-w} ${tipCtl} ${-w} ${len} 0 C ${tipCtl} ${w} ${len * 0.06} ${w} 0 0 Z`} fill="none" stroke="oklch(0.43 0.13 146)" strokeWidth={0.8} />
    </g>
  );
}

export function DailyPlant({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.max((done / total) * 100, 0), 100) : 0;
  const stage = stageOf(pct);
  const [pick] = useState(() => {
    const id = SPECIES_IDS[Math.floor(Math.random() * SPECIES_IDS.length)];
    const [lo, hi] = SPECIES[id].petalRange;
    return { id, petals: lo + Math.floor(Math.random() * (hi - lo + 1)) };
  });

  const flower = SPECIES[pick.id].label.toLowerCase();
  const msg =
    stage === 6 ? `In full bloom — a ${flower} for the whole day.` :
    stage >= 4 ? "Growing nicely. Keep going." :
    stage >= 1 ? "A good start. One at a time." :
    "Plant today's seed — tap a card to begin.";

  return (
    <div className="flex items-center gap-6 rounded-xl border border-border bg-surface p-7 md:p-8">
      <PlantArt stage={stage} species={pick.id} petals={pick.petals} />
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
