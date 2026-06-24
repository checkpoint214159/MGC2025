import { describe, it, expect } from "vitest";
import {
    getCompletionSignal,
    getProgressStagnation,
    getProgressRegression,
    evaluateRecoveryFlags,
    type DayProgress,
} from "@/lib/engagement/flags";
import type { DayPain } from "@/lib/engagement/arc";

const p = (...vals: number[]): DayProgress[] =>
    vals.map((progress, i) => ({ day: i + 1, progress }));

describe("getCompletionSignal", () => {
    it("flags when latest progress is in the near-complete band", () => {
        expect(getCompletionSignal(p(70, 80, 92)).near).toBe(true);
    });
    it("does not flag below the threshold", () => {
        expect(getCompletionSignal(p(70, 80, 85)).near).toBe(false);
    });
    it("does not flag once fully complete (100%)", () => {
        expect(getCompletionSignal(p(95, 100)).near).toBe(false);
    });
    it("does not flag with no data", () => {
        expect(getCompletionSignal([]).near).toBe(false);
    });
});

describe("getProgressStagnation (7-day flat)", () => {
    it("flags when progress barely moves over the window", () => {
        expect(
            getProgressStagnation(p(55, 55, 56, 55, 56, 55, 56)).stalled,
        ).toBe(true);
    });
    it("does not flag when progress is climbing", () => {
        expect(
            getProgressStagnation(p(40, 44, 48, 52, 56, 60, 64)).stalled,
        ).toBe(false);
    });
    it("does not flag once complete", () => {
        expect(
            getProgressStagnation(p(100, 100, 100, 100, 100, 100, 100)).stalled,
        ).toBe(false);
    });
    it("does not flag with fewer days than the window", () => {
        expect(getProgressStagnation(p(50, 50, 50)).stalled).toBe(false);
    });
});

describe("getProgressRegression (2-day drop)", () => {
    it("flags two consecutive day-over-day declines", () => {
        expect(
            getProgressRegression(p(40, 50, 48, 45).map((d) => d)).dropping,
        ).toBe(true);
    });
    it("does not flag a single down day", () => {
        expect(getProgressRegression(p(40, 50, 48, 52)).dropping).toBe(false);
    });
    it("does not flag while climbing", () => {
        expect(getProgressRegression(p(40, 44, 48, 52)).dropping).toBe(false);
    });
    it("reports the from/to of the decline", () => {
        const r = getProgressRegression(p(40, 50, 48, 45));
        expect(r.from).toBe(50);
        expect(r.to).toBe(45);
    });
});

describe("evaluateRecoveryFlags", () => {
    it("returns nearing-completion for a near-done climber", () => {
        const flags = evaluateRecoveryFlags({
            progress: p(60, 70, 80, 88, 92),
        });
        expect(flags.map((f) => f.kind)).toEqual(["nearing_completion"]);
    });
    it("returns progress_stalled for a week of no gain", () => {
        const flags = evaluateRecoveryFlags({
            progress: p(30, 40, 50, 55, 55, 56, 55, 56, 55, 56),
        });
        expect(flags.some((f) => f.kind === "progress_stalled")).toBe(true);
    });
    it("a 2-day drop supersedes stalled/nearing framings", () => {
        const flags = evaluateRecoveryFlags({
            progress: p(80, 90, 95, 92, 88),
        });
        expect(flags.map((f) => f.kind)).toEqual(["progress_dropping"]);
    });
    it("includes the pain-stagnation flag when pain plateaus", () => {
        const pain: DayPain[] = [
            { day: 6, pain: 6 },
            { day: 7, pain: 6 },
            { day: 8, pain: 6 },
        ];
        const flags = evaluateRecoveryFlags({ progress: p(20, 24, 28), pain });
        expect(flags.some((f) => f.kind === "pain_stagnation")).toBe(true);
    });
    it("orders critical before info", () => {
        const flags = evaluateRecoveryFlags({
            progress: p(80, 90, 95, 92, 88),
            pain: [
                { day: 6, pain: 6 },
                { day: 7, pain: 6 },
                { day: 8, pain: 6 },
            ],
        });
        expect(flags[0].severity).toBe("critical");
    });
});
