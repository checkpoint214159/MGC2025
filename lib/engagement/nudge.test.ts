import { describe, it, expect } from "vitest";
import { selectNudge } from "@/lib/engagement/nudge";
import type { Priority } from "@/lib/engagement";

const p = (id: string, isComplete: boolean): Priority => ({
  id,
  moduleType: "exercise",
  title: `Task ${id}`,
  context: "",
  isComplete,
  href: "/recovery/exercise",
});

describe("selectNudge", () => {
  it("returns null with no priorities", () => {
    expect(selectNudge([], { hour: 10 })).toBeNull();
  });

  it("returns null when everything is done", () => {
    expect(selectNudge([p("1", true), p("2", true)], { hour: 19 })).toBeNull();
  });

  it("nudges to finish the last remaining task at any hour", () => {
    const n = selectNudge([p("1", true), p("2", false)], { hour: 11 });
    expect(n?.id).toBe("last-one");
    expect(n?.action?.href).toBe("/recovery/exercise");
  });

  it("nudges in the evening when several remain", () => {
    const n = selectNudge([p("1", false), p("2", false), p("3", false)], { hour: 19 });
    expect(n?.id).toBe("evening-open");
  });

  it("stays quiet in the morning when several remain (no nagging)", () => {
    expect(selectNudge([p("1", false), p("2", false)], { hour: 9 })).toBeNull();
  });
});
