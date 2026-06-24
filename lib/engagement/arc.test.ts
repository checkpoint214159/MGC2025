import { describe, it, expect } from "vitest";
import {
    getExpectedRecovery,
    getActualVsExpected,
    getStagnationSignal,
    type DayPain,
} from "@/lib/engagement/arc";

describe("getExpectedRecovery", () => {
    it("starts at baseline on day 1", () => {
        expect(
            getExpectedRecovery({
                recoveryDay: 1,
                recoveryDays: 21,
                baselinePain: 8,
            }),
        ).toBeCloseTo(8, 5);
    });
    it("reaches ~0 at the end of the arc", () => {
        expect(
            getExpectedRecovery({
                recoveryDay: 21,
                recoveryDays: 21,
                baselinePain: 8,
            }),
        ).toBeCloseTo(0, 5);
    });
    it("decreases monotonically", () => {
        const a = getExpectedRecovery({
            recoveryDay: 5,
            recoveryDays: 21,
            baselinePain: 8,
        });
        const b = getExpectedRecovery({
            recoveryDay: 10,
            recoveryDays: 21,
            baselinePain: 8,
        });
        expect(b).toBeLessThan(a);
    });
});

describe("getActualVsExpected", () => {
    it("produces one point per recovery day, on-track with no data", () => {
        const r = getActualVsExpected([], 21, 8);
        expect(r.points).toHaveLength(21);
        expect(r.onTrack).toBe(true);
    });
    it("is on track when actual is near expected", () => {
        const series: DayPain[] = [{ day: 10, pain: 3 }];
        expect(getActualVsExpected(series, 21, 8).onTrack).toBe(true);
    });
    it("is off track when actual pain is well above expected", () => {
        const r = getActualVsExpected([{ day: 18, pain: 8 }], 21, 8);
        expect(r.onTrack).toBe(false);
        expect(r.deltaToday).toBeGreaterThan(1);
    });
});

describe("getStagnationSignal (the flag rule)", () => {
    const s = (...vals: number[]): DayPain[] =>
        vals.map((pain, i) => ({ day: i + 1, pain }));
    it("does not flag when pain is decreasing", () => {
        expect(getStagnationSignal(s(7, 6, 5)).stalled).toBe(false);
    });
    it("flags when pain is flat or rising above the floor", () => {
        expect(getStagnationSignal(s(6, 6, 6)).stalled).toBe(true);
        expect(getStagnationSignal(s(5, 6, 7)).stalled).toBe(true);
    });
    it("does not flag when settled at/below the floor", () => {
        expect(getStagnationSignal(s(1, 1, 1)).stalled).toBe(false);
    });
    it("does not flag with fewer days than the window", () => {
        expect(getStagnationSignal(s(8, 8)).stalled).toBe(false);
    });
});
