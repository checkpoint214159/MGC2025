import { describe, it, expect } from "vitest";
import { buildRollingTrends, type DailyMetricRow } from "@/lib/memory/rolling";

// asOf is fixed; rows are dated by "days before asOf" for clarity.
const ASOF = new Date("2026-06-28T00:00:00.000Z");
const daysAgo = (n: number) =>
    new Date(ASOF.getTime() - n * 86_400_000).toISOString().slice(0, 10);

const row = (
    n: number,
    compliancePct: number | null,
    painScore: number | null,
): DailyMetricRow => ({ date: daysAgo(n), compliancePct, painScore });

describe("buildRollingTrends", () => {
    it("returns empty string with no rows", () => {
        expect(buildRollingTrends([], ASOF)).toBe("");
    });

    it("returns empty when all rows fall outside every window (>30d old)", () => {
        expect(buildRollingTrends([row(40, 80, 3)], ASOF)).toBe("");
    });

    it("reports a 7d compliance + pain mean", () => {
        const rows = [row(1, 30, 6), row(2, 50, 6), row(3, 40, 6)];
        const out = buildRollingTrends(rows, ASOF);
        expect(out).toContain("ROLLING TRENDS");
        expect(out).toContain("Compliance: 7d 40% (3d logged)");
        expect(out).toContain("Pain: 7d avg 6.0/10");
    });

    it("shows week-over-week direction arrows (compliance up, pain down = both ▲/▼ correctly)", () => {
        // last 7d: compliance high, pain low; prior 7d: compliance low, pain high
        const rows = [
            row(1, 80, 3),
            row(2, 80, 3), // last 7d
            row(8, 40, 7),
            row(9, 40, 7), // prior 7d
        ];
        const out = buildRollingTrends(rows, ASOF);
        // compliance improved 40 → 80 → ▲
        expect(out).toMatch(/Compliance: 7d 80%.*▲ from 40% the prior 7d/);
        // pain improved (lower) 7 → 3 → ▲ (better), arrow shown in pain line
        expect(out).toMatch(
            /Pain: 7d avg 3\.0\/10 \(▲ from 7\.0 the prior 7d\)/,
        );
    });

    it("marks a flat week with → (within epsilon)", () => {
        const rows = [row(1, 60, 6), row(8, 60, 6)];
        const out = buildRollingTrends(rows, ASOF);
        expect(out).toContain("→ from 60% the prior 7d");
    });

    it("includes a 30d figure alongside the 7d window", () => {
        const rows = [
            row(1, 90, 4), // in 7d + 30d
            row(20, 50, 6), // in 30d only
        ];
        const out = buildRollingTrends(rows, ASOF);
        expect(out).toContain("30d"); // 30d mean present
        expect(out).toContain("7d 90%");
    });

    it("ignores null metric values when averaging", () => {
        const rows = [row(1, 100, null), row(2, null, 8), row(3, 50, 4)];
        const out = buildRollingTrends(rows, ASOF);
        // compliance mean over [100, 50] = 75 (the null compliance row skipped)
        expect(out).toContain("7d 75% (2d logged)");
        // pain mean over [8, 4] = 6.0
        expect(out).toContain("Pain: 7d avg 6.0/10");
    });
});
