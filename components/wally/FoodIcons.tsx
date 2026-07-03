"use client";

import { ReactNode } from "react";

/**
 * Detailed flat-style SVG illustrations of Singapore hawker dishes (not emojis) for the
 * nutrition log. Each renders in a warm tile, drawn from shared plate/bowl bases.
 *
 * Calories/protein are per typical hawker serving, referenced from
 * https://singaporecalorie.com/ (e.g. char kway teow 744 kcal, roti prata 302 kcal/pc,
 * chicken rice 607 kcal) and https://healthscreening.sg/food-calories-calculator-singapore
 * — rounded for the demo.
 */
export type DishId =
    | "beeHoon"
    | "charKwayTeow"
    | "kwayChap"
    | "friedRice"
    | "meeSoto"
    | "meeSiam"
    | "prataCurry"
    | "prataSugar"
    | "fishSoup"
    | "chickenRice";

export type Dish = {
    id: DishId;
    name: string;
    kcal: number;
    protein: number; // grams
    note?: string;
};

export const SG_DISHES: Dish[] = [
    { id: "beeHoon", name: "Economical bee hoon", kcal: 450, protein: 12, note: "with egg" },
    { id: "meeSoto", name: "Mee soto", kcal: 432, protein: 21, note: "chicken broth" },
    { id: "fishSoup", name: "Sliced fish soup", kcal: 434, protein: 30, note: "gentle + high protein" },
    { id: "kwayChap", name: "Kway chap", kcal: 648, protein: 32, note: "braised, high protein" },
    { id: "chickenRice", name: "Chicken rice", kcal: 607, protein: 25 },
    { id: "meeSiam", name: "Mee siam", kcal: 519, protein: 18 },
    { id: "friedRice", name: "Fried rice", kcal: 630, protein: 18 },
    { id: "charKwayTeow", name: "Char kway teow", kcal: 744, protein: 23, note: "richer choice" },
    { id: "prataCurry", name: "Roti prata + curry", kcal: 505, protein: 12, note: "2 plain" },
    { id: "prataSugar", name: "Roti prata + sugar", kcal: 400, protein: 7 },
];

/* ── shared bases ─────────────────────────────────────────────────────────── */

const PLATE = (
    <>
        <ellipse cx="24" cy="30" rx="19" ry="11" fill="oklch(0.99 0.005 90)" stroke="oklch(0.85 0.02 80)" strokeWidth="1" />
        <ellipse cx="24" cy="29.4" rx="14.5" ry="8" fill="oklch(0.96 0.012 85)" />
    </>
);

function Bowl({ broth }: { broth: string }) {
    return (
        <>
            <path d="M 6 24 A 18 15 0 0 0 42 24 L 42 25 A 18 16 0 0 1 6 25 Z" fill="oklch(0.99 0.005 90)" />
            <path d="M 6 24.5 A 18 15.5 0 0 0 42 24.5 Q 42 38 24 38 Q 6 38 6 24.5 Z" fill="oklch(0.93 0.03 250)" stroke="oklch(0.8 0.04 250)" strokeWidth="1" />
            <ellipse cx="24" cy="24" rx="18" ry="6.5" fill={broth} stroke="oklch(0.82 0.03 80)" strokeWidth="1" />
            <path d="M 13 40 L 35 40" stroke="oklch(0.8 0.04 250)" strokeWidth="1.6" strokeLinecap="round" />
        </>
    );
}

/** wavy noodle strands clipped to an ellipse-ish area */
function Noodles({ color, y = 27, dark = false }: { color: string; y?: number; dark?: boolean }) {
    const rows = [y - 3, y, y + 3];
    return (
        <>
            {rows.map((ry, i) => (
                <path
                    key={i}
                    d={`M ${12 + i} ${ry} q 3 -2.6 6 0 t 6 0 t 6 0 t 6 0`}
                    fill="none"
                    stroke={color}
                    strokeWidth={dark ? 2.4 : 1.9}
                    strokeLinecap="round"
                />
            ))}
        </>
    );
}

const fleck = (cx: number, cy: number, c: string, r = 1.2): ReactNode => <circle cx={cx} cy={cy} r={r} fill={c} />;

/* ── the dishes ───────────────────────────────────────────────────────────── */

const ART: Record<DishId, ReactNode> = {
    beeHoon: (
        <>
            {PLATE}
            <Noodles color="oklch(0.85 0.09 90)" />
            {/* fried egg */}
            <ellipse cx="30" cy="25" rx="6" ry="4" fill="oklch(0.99 0.01 95)" stroke="oklch(0.9 0.03 90)" strokeWidth="0.8" />
            <circle cx="30" cy="25" r="2.1" fill="oklch(0.8 0.16 85)" />
            {fleck(15, 25, "oklch(0.55 0.12 145)", 1.4)}
            {fleck(19, 30, "oklch(0.55 0.12 145)", 1.2)}
            {fleck(25, 32, "oklch(0.62 0.19 32)", 1.2)}
        </>
    ),
    charKwayTeow: (
        <>
            {PLATE}
            <Noodles color="oklch(0.45 0.07 60)" dark />
            <Noodles color="oklch(0.58 0.09 75)" y={25} />
            {/* cockles + lap cheong + greens */}
            {fleck(17, 24, "oklch(0.62 0.16 40)", 1.7)}
            {fleck(29, 30, "oklch(0.62 0.16 40)", 1.6)}
            <ellipse cx="24" cy="23.5" rx="2.4" ry="1.3" fill="oklch(0.6 0.19 25)" />
            <ellipse cx="32" cy="26" rx="2.2" ry="1.2" fill="oklch(0.6 0.19 25)" />
            {fleck(14, 29, "oklch(0.55 0.12 145)", 1.5)}
            {fleck(20, 32, "oklch(0.55 0.12 145)", 1.2)}
        </>
    ),
    kwayChap: (
        <>
            <Bowl broth="oklch(0.5 0.08 55)" />
            {/* flat kway sheets */}
            <path d="M 13 23 q 5 -2.5 10 0" stroke="oklch(0.97 0.01 90)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 20 26 q 5 -2 9 0" stroke="oklch(0.95 0.015 90)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            {/* braised pork + tau pok + egg half */}
            <rect x="28" y="19.5" width="7" height="4.6" rx="1.4" fill="oklch(0.45 0.09 45)" stroke="oklch(0.38 0.08 45)" strokeWidth="0.7" />
            <rect x="12" y="19" width="5.4" height="4" rx="1" fill="oklch(0.75 0.1 80)" />
            <ellipse cx="24" cy="20.5" rx="3" ry="2.2" fill="oklch(0.96 0.02 95)" />
            <circle cx="24" cy="20.5" r="1.3" fill="oklch(0.72 0.13 80)" />
        </>
    ),
    friedRice: (
        <>
            {PLATE}
            {/* rice mound */}
            <path d="M 13 29 Q 15 20 24 19.5 Q 33 20 35 29 Q 30 32.5 24 32.5 Q 18 32.5 13 29 Z" fill="oklch(0.9 0.07 90)" stroke="oklch(0.82 0.08 88)" strokeWidth="0.8" />
            {fleck(19, 24, "oklch(0.55 0.12 145)", 1.3)}
            {fleck(27, 22.5, "oklch(0.65 0.15 45)", 1.3)}
            {fleck(23, 27, "oklch(0.8 0.16 85)", 1.4)}
            {fleck(29, 27.5, "oklch(0.55 0.12 145)", 1.1)}
            {fleck(16, 27.5, "oklch(0.65 0.15 45)", 1.1)}
            {/* prawn */}
            <path d="M 27 30.5 q 4 -1.6 6 1 q -2.4 2 -5.4 1" fill="oklch(0.72 0.14 35)" stroke="oklch(0.62 0.15 35)" strokeWidth="0.7" />
        </>
    ),
    meeSoto: (
        <>
            <Bowl broth="oklch(0.82 0.12 85)" />
            <Noodles color="oklch(0.85 0.11 92)" y={23} />
            {/* shredded chicken + celery + chilli */}
            <path d="M 26 20.5 q 3.4 -1.4 6.4 0" stroke="oklch(0.9 0.03 80)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            {fleck(15, 21, "oklch(0.55 0.12 145)", 1.2)}
            {fleck(31, 24, "oklch(0.55 0.12 145)", 1.1)}
            {fleck(20, 20, "oklch(0.58 0.2 28)", 1.2)}
        </>
    ),
    meeSiam: (
        <>
            <Bowl broth="oklch(0.72 0.13 55)" />
            <Noodles color="oklch(0.82 0.1 70)" y={23} />
            {/* egg half, tau pok, lime wedge */}
            <ellipse cx="17" cy="20.5" rx="3" ry="2.2" fill="oklch(0.96 0.02 95)" />
            <circle cx="17" cy="20.5" r="1.3" fill="oklch(0.72 0.13 80)" />
            <rect x="27" y="18.8" width="5" height="3.6" rx="1" fill="oklch(0.75 0.1 80)" />
            <path d="M 34.5 22.5 a 2.6 2.6 0 0 1 3 2.4 l -3 0 Z" fill="oklch(0.72 0.16 130)" />
        </>
    ),
    prataCurry: (
        <>
            {PLATE}
            {/* folded prata: layered swirl */}
            <circle cx="20" cy="26.5" r="7.2" fill="oklch(0.88 0.06 85)" stroke="oklch(0.78 0.08 80)" strokeWidth="0.9" />
            <path d="M 20 26.5 m -4.6 0 a 4.6 4.6 0 1 1 9.2 0 a 3 3 0 1 1 -6 0" fill="none" stroke="oklch(0.78 0.08 80)" strokeWidth="0.9" />
            {/* curry dish */}
            <ellipse cx="33.5" cy="27.5" rx="6" ry="3.6" fill="oklch(0.99 0.005 90)" stroke="oklch(0.85 0.02 80)" strokeWidth="0.8" />
            <ellipse cx="33.5" cy="27" rx="4.6" ry="2.5" fill="oklch(0.55 0.13 45)" />
            {fleck(33.5, 26.6, "oklch(0.45 0.11 40)", 1)}
        </>
    ),
    prataSugar: (
        <>
            {PLATE}
            <circle cx="23" cy="26.5" r="7.6" fill="oklch(0.88 0.06 85)" stroke="oklch(0.78 0.08 80)" strokeWidth="0.9" />
            <path d="M 23 26.5 m -4.8 0 a 4.8 4.8 0 1 1 9.6 0 a 3.1 3.1 0 1 1 -6.2 0" fill="none" stroke="oklch(0.78 0.08 80)" strokeWidth="0.9" />
            {/* sugar sprinkle + mound */}
            {fleck(20, 23, "oklch(0.99 0 0)", 0.8)}
            {fleck(25, 22, "oklch(0.99 0 0)", 0.7)}
            {fleck(27, 25.5, "oklch(0.99 0 0)", 0.8)}
            {fleck(21, 27.5, "oklch(0.99 0 0)", 0.7)}
            <path d="M 32 30 q 2.4 -3 4.8 0 Z" fill="oklch(0.98 0.005 90)" stroke="oklch(0.88 0.01 85)" strokeWidth="0.7" />
        </>
    ),
    fishSoup: (
        <>
            <Bowl broth="oklch(0.93 0.02 90)" />
            {/* fish slices + greens + tomato */}
            <path d="M 14 22.5 q 3.6 -2.2 7 0 q -3.4 2.2 -7 0 Z" fill="oklch(0.97 0.008 80)" stroke="oklch(0.88 0.015 75)" strokeWidth="0.8" />
            <path d="M 24 20.5 q 3.4 -2 6.6 0 q -3.2 2 -6.6 0 Z" fill="oklch(0.97 0.008 80)" stroke="oklch(0.88 0.015 75)" strokeWidth="0.8" />
            {fleck(33, 23.5, "oklch(0.62 0.17 30)", 1.8)}
            {fleck(17, 25.5, "oklch(0.55 0.12 145)", 1.4)}
            {fleck(27, 24.5, "oklch(0.55 0.12 145)", 1.2)}
        </>
    ),
    chickenRice: (
        <>
            {PLATE}
            {/* rice mound + fanned chicken slices + cucumber */}
            <path d="M 14 27 Q 16 21 22 20.5 Q 28 21 29 27 Q 25 29.5 21.5 29.5 Q 17.5 29.5 14 27 Z" fill="oklch(0.95 0.02 90)" stroke="oklch(0.88 0.03 88)" strokeWidth="0.8" />
            <path d="M 26 24 q 5 -2.6 9 0.6 l -1 3 q -4.4 -1.6 -8 -1.4 Z" fill="oklch(0.9 0.05 80)" stroke="oklch(0.8 0.06 75)" strokeWidth="0.8" />
            <path d="M 28.2 24.1 l 0.5 3.1 M 30.6 23.7 l 0.7 3.2 M 33 23.9 l 0.6 3.1" stroke="oklch(0.8 0.06 75)" strokeWidth="0.7" />
            <ellipse cx="18" cy="31" rx="2.2" ry="1.1" fill="oklch(0.85 0.08 135)" />
            <ellipse cx="23.5" cy="31.8" rx="2.2" ry="1.1" fill="oklch(0.85 0.08 135)" />
            {fleck(31, 30.5, "oklch(0.58 0.2 28)", 1.3)}
        </>
    ),
};

export function FoodIcon({ dish, size = 56 }: { dish: DishId; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-hidden className="shrink-0">
            <rect x="1" y="1" width="46" height="46" rx="12" fill="oklch(0.97 0.018 85)" />
            {ART[dish]}
        </svg>
    );
}
