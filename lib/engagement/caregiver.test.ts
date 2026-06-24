import { describe, it, expect } from "vitest";
import { caregiverCopy } from "@/lib/engagement/caregiver";

describe("caregiverCopy", () => {
    it("returns patient-facing copy by default", () => {
        const c = caregiverCopy(false, "Margaret");
        expect(c.heading).toBe("");
        expect(c.possessive).toBe("your");
        expect(c.actionVerb).toBe("Do your");
    });

    it("reframes to caregiver second-person", () => {
        const c = caregiverCopy(true, "Margaret");
        expect(c.heading).toBe("Helping Margaret");
        expect(c.possessive).toBe("their");
        expect(c.subject).toBe("they");
        expect(c.actionVerb).toBe("Help them with");
    });
});
