import { describe, it, expect } from "vitest";
import { getStreak, type DayRecord } from "@/lib/engagement/streak";

// "C" = day complete, "M" = day missed; oldest → newest.
const days = (pattern: string): DayRecord[] =>
  pattern.split("").map((c, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
    allComplete: c === "C",
  }));

describe("getStreak", () => {
  it("counts consecutive complete days", () => {
    expect(getStreak(days("CCC"))).toEqual({ count: 3, atCap: false, reset: false });
  });

  it("caps the count at 7", () => {
    const s = getStreak(days("CCCCCCCCCC"));
    expect(s.count).toBe(7);
    expect(s.atCap).toBe(true);
  });

  it("forgives a single miss (one bad day does not kill it)", () => {
    expect(getStreak(days("CCMCC"))).toEqual({ count: 4, atCap: false, reset: false });
  });

  it("resets after two consecutive misses", () => {
    expect(getStreak(days("CCMM"))).toEqual({ count: 0, atCap: false, reset: true });
  });

  it("does not reset on non-consecutive misses", () => {
    expect(getStreak(days("CMCMC")).count).toBe(3);
  });

  it("recovers after a reset", () => {
    expect(getStreak(days("CCMMCCC")).count).toBe(3);
  });

  it("handles empty history", () => {
    expect(getStreak([])).toEqual({ count: 0, atCap: false, reset: false });
  });
});
