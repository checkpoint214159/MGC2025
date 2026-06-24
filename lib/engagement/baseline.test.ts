import { describe, it, expect } from "vitest";
import { getBaselineDelta } from "@/lib/engagement/baseline";

describe("getBaselineDelta", () => {
    it("reports improvement when higher is better", () => {
        expect(getBaselineDelta("Walking", 120, 50)).toEqual({
            metric: "Walking",
            now: 120,
            baseline: 50,
            delta: 70,
            better: true,
        });
    });

    it("reports regression", () => {
        expect(getBaselineDelta("Walking", 30, 50).better).toBe(false);
    });

    it("treats lower-is-better metrics correctly", () => {
        expect(getBaselineDelta("Pain", 2, 6, false).better).toBe(true);
    });

    it("treats holding steady as not-worse", () => {
        expect(getBaselineDelta("Walking", 50, 50).better).toBe(true);
    });
});
