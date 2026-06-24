import { describe, it, expect } from "vitest";
import {
    applyConsolidation,
    buildRawWindow,
    shouldConsolidate,
    renderMemoryForPrompt,
} from "./transforms";
import type { PatientMemory } from "./schema";

const base = (over: Partial<PatientMemory> = {}): PatientMemory => ({
    semantic: "- Total knee replacement, left.\n- Penicillin allergy.",
    episodic: [],
    consolidatedThrough: new Date("2026-06-01T00:00:00Z"),
    ...over,
});

describe("applyConsolidation — erosion guards", () => {
    it("appends genuinely-new semantic facts and never duplicates existing ones", () => {
        const prior = base();
        const out = applyConsolidation({
            prior,
            output: {
                newSemanticFacts: [
                    "Penicillin allergy.",
                    "Now on metformin 500mg.",
                ],
                currentPhaseNarrative: "Settling in.",
            },
            currentPhase: "early",
            newWatermark: new Date("2026-06-05T00:00:00Z"),
        });
        // existing allergy not re-added; only the metformin fact appended
        expect(out.semantic).toContain("Penicillin allergy.");
        expect(out.semantic.match(/Penicillin allergy/g)?.length).toBe(1);
        expect(out.semantic).toContain("Now on metformin 500mg.");
    });

    it("never rewrites existing semantic text", () => {
        const prior = base();
        const out = applyConsolidation({
            prior,
            output: { newSemanticFacts: [], currentPhaseNarrative: "x" },
            currentPhase: "early",
            newWatermark: new Date(),
        });
        expect(out.semantic).toBe(prior.semantic);
    });

    it("freezes earlier phases and upserts the current phase narrative", () => {
        const prior = base({
            episodic: [
                {
                    phase: "early",
                    narrative: "Rough first week.",
                    closed: false,
                },
            ],
        });
        const out = applyConsolidation({
            prior,
            output: {
                newSemanticFacts: [],
                currentPhaseNarrative: "Walking unaided now.",
            },
            currentPhase: "re-engagement",
            newWatermark: new Date(),
        });
        const early = out.episodic.find((s) => s.phase === "early");
        const reeng = out.episodic.find((s) => s.phase === "re-engagement");
        expect(early?.closed).toBe(true); // earlier phase frozen
        expect(early?.narrative).toBe("Rough first week."); // and untouched
        expect(reeng?.narrative).toBe("Walking unaided now.");
        expect(reeng?.closed).toBe(false);
    });

    it("replaces the current phase narrative in place when it already exists", () => {
        const prior = base({
            episodic: [{ phase: "early", narrative: "old", closed: false }],
        });
        const out = applyConsolidation({
            prior,
            output: { newSemanticFacts: [], currentPhaseNarrative: "new" },
            currentPhase: "early",
            newWatermark: new Date(),
        });
        expect(out.episodic.filter((s) => s.phase === "early")).toHaveLength(1);
        expect(out.episodic[0].narrative).toBe("new");
    });

    it("advances the watermark", () => {
        const wm = new Date("2026-07-01T12:00:00Z");
        const out = applyConsolidation({
            prior: base(),
            output: { newSemanticFacts: [], currentPhaseNarrative: "x" },
            currentPhase: "early",
            newWatermark: wm,
        });
        expect(out.consolidatedThrough).toEqual(wm);
    });
});

describe("buildRawWindow + shouldConsolidate", () => {
    const since = new Date("2026-06-01T00:00:00Z");
    const threads = [
        {
            title: "Chat",
            type: "chat",
            messages: [
                {
                    role: "user",
                    content: "old",
                    createdAt: "2026-05-30T00:00:00Z",
                }, // before watermark
                {
                    role: "user",
                    content: "new pain in knee",
                    createdAt: "2026-06-02T00:00:00Z",
                },
            ],
        },
    ];

    it("includes only messages newer than the watermark", () => {
        const w = buildRawWindow(threads, since);
        expect(w.messageCount).toBe(1);
        expect(w.text).toContain("new pain in knee");
        expect(w.text).not.toContain("old");
        expect(w.newestAt).toEqual(new Date("2026-06-02T00:00:00Z"));
    });

    it("does not trigger below threshold without a doctor note", () => {
        const w = buildRawWindow(threads, since);
        expect(shouldConsolidate(w, 10_000)).toBe(false);
    });

    it("triggers on a doctor note regardless of size", () => {
        const w = buildRawWindow(
            [
                {
                    title: "Note",
                    type: "doctor_note",
                    messages: [
                        {
                            role: "system",
                            content: "cleared for stairs",
                            createdAt: "2026-06-03T00:00:00Z",
                        },
                    ],
                },
            ],
            since,
        );
        expect(w.hasDoctorNote).toBe(true);
        expect(shouldConsolidate(w, 10_000)).toBe(true);
    });

    it("never triggers on an empty window", () => {
        const w = buildRawWindow([], since);
        expect(shouldConsolidate(w)).toBe(false);
    });
});

describe("renderMemoryForPrompt", () => {
    it("orders narrative by phase and labels closed sections", () => {
        const text = renderMemoryForPrompt(
            base({
                episodic: [
                    { phase: "re-engagement", narrative: "B", closed: false },
                    { phase: "early", narrative: "A", closed: true },
                ],
            }),
        );
        expect(text).toContain("STABLE CLINICAL FACTS");
        expect(text.indexOf("[early] (closed): A")).toBeLessThan(
            text.indexOf("[re-engagement]: B"),
        );
    });

    it("handles a null memory", () => {
        expect(renderMemoryForPrompt(null)).toContain("none on file");
    });
});
