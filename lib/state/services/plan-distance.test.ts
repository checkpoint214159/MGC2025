import { describe, it, expect } from "vitest";
import {
    capacityAt,
    expectedEnvelope,
    bandDeviation,
    clampToEnvelope,
} from "@/lib/state/services/plan-envelope";
import {
    matchTasks,
    jsDivergence,
    planDistance,
    clampBlueprintsToEnvelope,
    type PlanTask,
    type DistanceContext,
} from "@/lib/state/services/plan-distance";

/**
 * Tests for the plan-space distance metric (docs/PLAN_DISTANCE.md).
 * The correctness property that matters most: GRADUATED PROGRESSION COSTS NOTHING
 * (numeric axis 0 on-envelope), while intent drift and unexpected extremes accumulate.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

const task = (
    module: string,
    name: string,
    category: string,
    goal: number,
    intensity?: PlanTask["intensity"],
): PlanTask => ({
    module,
    name,
    category,
    goal,
    unit: "x",
    intensity,
    itemId: `${module}-${name}`,
    metricKey: category,
});

const CTX: DistanceContext = { recoveryDay: 1, anchorDay: 1, arcDays: 30 };
const CTX_MID: DistanceContext = { recoveryDay: 15, anchorDay: 1, arcDays: 30 };

const ANCHOR = [
    task("exercise", "Ankle pumps", "mobility", 20, "blue"),
    task("exercise", "Short assisted walk", "aerobic", 5, "blue"),
    task("nutrition", "Daily Macro Targets", "calories", 1800),
    task("sleep", "Nightly Sleep Target", "duration", 8),
];

// ── Envelope ─────────────────────────────────────────────────────────────────

describe("plan-envelope", () => {
    it("capacity is 1 at the anchor day and grows toward 1+gain at arc end", () => {
        expect(capacityAt(1, 1, 30, 1.5)).toBe(1);
        expect(capacityAt(30, 1, 30, 1.5)).toBeCloseTo(2.5, 5);
        // decelerating: mid-arc is past the halfway capacity point
        expect(capacityAt(15, 1, 30, 1.5)).toBeGreaterThan(1.75);
    });

    it("expected goal scales from the anchor along the arc", () => {
        const env = expectedEnvelope(20, 30, 1, 30, { gain: 1.5, beta: 0.25 });
        expect(env.expected).toBeCloseTo(50, 5); // 20 × 2.5
        expect(env.lower).toBeLessThan(env.expected);
        expect(env.upper).toBeGreaterThan(env.expected);
    });

    it("bandDeviation is 0 inside the band, signed outside", () => {
        const env = { expected: 100, lower: 80, upper: 125 };
        expect(bandDeviation(100, env)).toBe(0);
        expect(bandDeviation(124, env)).toBe(0);
        expect(bandDeviation(150, env)).toBeCloseTo(0.2, 5); // 25/125 above
        expect(bandDeviation(40, env)).toBeLessThan(0); // backsliding
    });

    it("clampToEnvelope projects to the nearest band edge", () => {
        const env = { expected: 100, lower: 80, upper: 125 };
        expect(clampToEnvelope(500, env)).toBe(125);
        expect(clampToEnvelope(10, env)).toBe(80);
        expect(clampToEnvelope(100, env)).toBe(100);
    });
});

// ── Matching ─────────────────────────────────────────────────────────────────

describe("matchTasks", () => {
    it("matches identical names and flags dropped anchor tasks", () => {
        const plan = [ANCHOR[0], ANCHOR[2]]; // walk + sleep dropped
        const { matches, added } = matchTasks(ANCHOR, plan);
        expect(matches.filter((m) => m.plan).length).toBe(2);
        expect(matches.filter((m) => !m.plan).length).toBe(2);
        expect(added.length).toBe(0);
    });

    it("matches renamed-but-equivalent tasks via token overlap + category", () => {
        const plan = [
            task("exercise", "Ankle pumps and circles", "mobility", 22, "blue"),
        ];
        const { matches } = matchTasks([ANCHOR[0]], plan);
        expect(matches[0].plan).not.toBeNull();
    });

    it("does not match across modules", () => {
        const plan = [task("nutrition", "Ankle pumps", "mobility", 20)];
        const { matches } = matchTasks([ANCHOR[0]], plan);
        expect(matches[0].plan).toBeNull();
    });
});

describe("jsDivergence", () => {
    it("is 0 for identical distributions and 1 for disjoint ones", () => {
        const p = new Map([
            ["a", 0.5],
            ["b", 0.5],
        ]);
        expect(jsDivergence(p, new Map(p))).toBeCloseTo(0, 5);
        expect(
            jsDivergence(new Map([["a", 1]]), new Map([["b", 1]])),
        ).toBeCloseTo(1, 5);
    });
});

// ── The metric ───────────────────────────────────────────────────────────────

describe("planDistance", () => {
    it("identical plan → D = 0 on every axis", () => {
        const r = planDistance(ANCHOR, ANCHOR, CTX);
        expect(r.D).toBe(0);
        expect(r.composition).toBe(0);
        expect(r.semantic).toBeCloseTo(0, 5);
        expect(r.numeric).toBe(0);
    });

    it("KEY PROPERTY: on-envelope graduated progression costs ~nothing", () => {
        // Mid-arc plan with every goal scaled by the expected capacity ratio.
        const scale = capacityAt(15, 1, 30) / capacityAt(1, 1, 30);
        const progressed = ANCHOR.map((t) => ({
            ...t,
            goal: Number((t.goal * scale).toFixed(1)),
        }));
        const r = planDistance(ANCHOR, progressed, CTX_MID);
        expect(r.numeric).toBe(0); // inside the envelope band
        expect(r.D).toBeLessThan(0.05);
    });

    it("an unexpected extreme jump dominates the numeric axis (p95, hinged)", () => {
        const jumped = ANCHOR.map((t, i) => (i === 1 ? { ...t, goal: 60 } : t)); // walk 5 → 60 min on day 1
        const r = planDistance(ANCHOR, jumped, CTX);
        expect(r.numeric).toBeGreaterThan(1); // hinge saturates
        expect(r.D).toBeGreaterThan(0.3);
        const walk = r.perTask.find((t) => t.name.includes("walk"));
        expect(walk?.deviation).toBeGreaterThan(1);
    });

    it("dropping prescribed tasks charges the composition axis", () => {
        const r = planDistance(ANCHOR, [ANCHOR[0]], CTX);
        expect(r.composition).toBeCloseTo(0.75, 2); // 1 of 4 kept
        expect(r.droppedTasks).toBe(3);
    });

    it("modality/intensity shift charges the semantic axis even with sane numbers", () => {
        // Same task count, but mobility work replaced by heavy resistance at red intensity.
        const shifted = [
            task("exercise", "Barbell squats", "resistance", 20, "red"),
            task("exercise", "Deadlifts", "resistance", 5, "red"),
            ANCHOR[2],
            ANCHOR[3],
        ];
        const r = planDistance(ANCHOR, shifted, CTX);
        expect(r.semantic).toBeGreaterThan(0.3);
        expect(r.composition).toBeGreaterThan(0); // the originals were dropped too
    });

    it("under-progression (backsliding) is also charged", () => {
        // Mid-arc but still at day-1 numbers → below the band's lower edge.
        const r = planDistance(ANCHOR, ANCHOR, CTX_MID);
        expect(r.numeric).toBeGreaterThan(0);
        expect(r.perTask.some((t) => t.deviation < 0)).toBe(true);
    });
});

// ── Clamp ────────────────────────────────────────────────────────────────────

describe("clampBlueprintsToEnvelope", () => {
    it("projects extreme goals back to the band edge and records the edit", () => {
        const blueprints: Record<string, { plan?: unknown }> = {
            exercise: {
                plan: [
                    {
                        id: "exercise-Short assisted walk",
                        meta: {
                            name: "Short assisted walk",
                            intensity: "blue",
                        },
                        data: {
                            aerobic: { goal: 60, value: 0, unit: "minutes" },
                        },
                    },
                ],
            },
        };
        const clamps = clampBlueprintsToEnvelope(
            blueprints,
            [task("exercise", "Short assisted walk", "aerobic", 5, "blue")],
            CTX,
        );
        expect(clamps.length).toBe(1);
        expect(clamps[0].from).toBe(60);
        expect(clamps[0].to).toBeLessThan(10); // back to ~the band edge around 5
        const metric = (
            blueprints.exercise.plan as Array<{
                data: Record<string, { goal: number }>;
            }>
        )[0].data.aerobic;
        expect(metric.goal).toBe(clamps[0].to); // mutated in place
    });

    it("leaves in-band goals untouched", () => {
        const blueprints: Record<string, { plan?: unknown }> = {
            exercise: {
                plan: [
                    {
                        id: "exercise-Ankle pumps",
                        meta: { name: "Ankle pumps", intensity: "blue" },
                        data: {
                            mobility: { goal: 21, value: 0, unit: "reps" },
                        },
                    },
                ],
            },
        };
        const clamps = clampBlueprintsToEnvelope(
            blueprints,
            [task("exercise", "Ankle pumps", "mobility", 20, "blue")],
            CTX,
        );
        expect(clamps.length).toBe(0);
    });
});
