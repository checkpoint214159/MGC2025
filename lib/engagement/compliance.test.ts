import { describe, it, expect } from "vitest";
import {
    getDayCompliance,
    getComplianceSeries,
} from "@/lib/engagement/compliance";
import { getLowComplianceSignal } from "@/lib/engagement/flags";
import type { State } from "@/lib/state/schemas/state";

/**
 * Build a State whose modules carry the given metrics. Each metric is a [goal, value] pair;
 * a metric with goal 0 stands in for a symptom reading (no target to hit). Only the fields
 * getDayCompliance reads are populated — cast once here so the tests stay terse.
 */
function stateWith(
    modules: { type: string; metrics: [number, number][] }[],
    date = "2026-06-10",
): State {
    return {
        id: `s-${date}`,
        userId: "u1",
        dateCreated: new Date(date),
        modules: modules.map((m, mi) => ({
            type: m.type,
            id: `m-${mi}`,
            stateId: `s-${date}`,
            progress: {
                id: `p-${mi}`,
                moduleId: `m-${mi}`,
                trackables: [
                    {
                        id: `t-${mi}`,
                        data: Object.fromEntries(
                            m.metrics.map(([goal, value], i) => [
                                `metric${i}`,
                                { goal, value, unit: "x" },
                            ]),
                        ),
                    },
                ],
            },
        })),
    } as unknown as State;
}

describe("getDayCompliance", () => {
    it("reports 100% when every goal-bearing task is met", () => {
        const s = stateWith([
            {
                type: "exercise",
                metrics: [
                    [10, 10],
                    [20, 20],
                ],
            },
            {
                type: "nutrition",
                metrics: [
                    [2000, 2000],
                    [100, 100],
                ],
            },
        ]);
        expect(getDayCompliance(s)).toEqual({
            completedTasks: 4,
            totalTasks: 4,
            pct: 100,
        });
    });

    it("reports 75% when 3 of 4 tasks are met (the spec example)", () => {
        const s = stateWith([
            {
                type: "exercise",
                metrics: [
                    [10, 10],
                    [20, 5],
                ],
            }, // 1/2
            {
                type: "nutrition",
                metrics: [
                    [2000, 2000],
                    [100, 100],
                ],
            }, // 2/2
        ]);
        expect(getDayCompliance(s).pct).toBe(75);
    });

    it("counts value >= goal as complete (overshoot still completes)", () => {
        const s = stateWith([{ type: "exercise", metrics: [[10, 14]] }]);
        expect(getDayCompliance(s).pct).toBe(100);
    });

    it("excludes symptom metrics (goal 0) from the task count", () => {
        const s = stateWith([
            { type: "exercise", metrics: [[10, 10]] }, // 1 task, done
            { type: "symptoms", metrics: [[0, 6]] }, // pain reading, not a task
        ]);
        expect(getDayCompliance(s)).toEqual({
            completedTasks: 1,
            totalTasks: 1,
            pct: 100,
        });
    });

    it("returns null pct when there are no goal-bearing tasks", () => {
        const s = stateWith([{ type: "symptoms", metrics: [[0, 6]] }]);
        expect(getDayCompliance(s).pct).toBeNull();
    });

    it("returns null pct for an empty / missing state", () => {
        expect(getDayCompliance(null).pct).toBeNull();
        expect(getDayCompliance(stateWith([])).pct).toBeNull();
    });

    it("spans all modules (exercise + nutrition + sleep) for one combined percent", () => {
        const s = stateWith([
            { type: "exercise", metrics: [[10, 10]] },
            { type: "nutrition", metrics: [[100, 50]] },
            { type: "sleep", metrics: [[8, 8]] },
        ]);
        // 2 of 3 done → 67%
        expect(getDayCompliance(s)).toEqual({
            completedTasks: 2,
            totalTasks: 3,
            pct: 67,
        });
    });
});

describe("getComplianceSeries", () => {
    it("maps states to an ascending day/progress series, skipping task-less days", () => {
        const surgery = new Date("2026-06-01");
        const states = [
            stateWith(
                [{ type: "exercise", metrics: [[10, 10]] }],
                "2026-06-02",
            ), // day 2, 100%
            stateWith([{ type: "symptoms", metrics: [[0, 5]] }], "2026-06-03"), // no tasks → skipped
            stateWith([{ type: "exercise", metrics: [[10, 4]] }], "2026-06-04"), // day 4, 0%
        ];
        const series = getComplianceSeries(states, surgery);
        expect(series).toEqual([
            { day: 2, progress: 100 },
            { day: 4, progress: 0 },
        ]);
    });
});

describe("getLowComplianceSignal", () => {
    const series = (...vals: number[]) =>
        vals.map((progress, i) => ({ day: i + 1, progress }));

    it("flags when the trailing-window mean is under the threshold", () => {
        expect(getLowComplianceSignal(series(40, 30, 20)).low).toBe(true);
    });

    it("does not flag when the mean is at/above the threshold", () => {
        expect(getLowComplianceSignal(series(80, 70, 90)).low).toBe(false);
    });

    it("respects a custom threshold", () => {
        // mean 60: below an 80 threshold, above the default 50
        expect(getLowComplianceSignal(series(60, 60, 60)).low).toBe(false);
        expect(getLowComplianceSignal(series(60, 60, 60), 80).low).toBe(true);
    });

    it("needs a full window before it can fire", () => {
        expect(getLowComplianceSignal(series(10, 10)).low).toBe(false);
    });
});
