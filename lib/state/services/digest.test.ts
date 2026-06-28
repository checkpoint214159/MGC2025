/**
 * Tests for buildHeuristicDigest — the deterministic context layer fed to the LLM.
 *
 * WHY these tests exist (item 2 of TODO):
 *   A pure-heuristic system would fire a fixed rule like "day 14 post-op → reduce intensity".
 *   buildHeuristicDigest hands the LLM labelled, patient-specific signals it can reason over:
 *   pain trajectory vs the patient's OWN baseline, compliance streak, phase label, etc.
 *   These tests document the exact signals the LLM receives and assert they're computed
 *   correctly — so if they break, the LLM's "intuition" degrades silently.
 *
 *   Scenarios that would break a hardcoded rule but are handled here:
 *   - Patient A: pain plateau at 6/10 for 4 days despite doing ALL exercises → stagnation flag
 *     fired, LLM knows to escalate (hardcoded "day N → intensity up" would do the opposite)
 *   - Patient B: day 8, only 20% compliance last 7 days → adherence drop in context tells LLM
 *     to adjust expectations downward rather than progress the plan on schedule
 *   - Patient C: no surgery date in profile → LLM prompted to ask before adjusting phase
 */

import { describe, it, expect } from "vitest";
import { buildHeuristicDigest } from "@/lib/state/services/digest";
import type { State } from "@/lib/state/schemas/state";

// ── Factories ─────────────────────────────────────────────────────────────────

/** Exercise-module state where the patient completed (or skipped) the plan for that day. */
function exerciseState(date: string, complete: boolean, id?: string): State {
    const sid = id ?? `state-${date}`;
    const mid = `mod-${sid}`;
    const pid = `ex-${sid}`;
    const goal = 30;
    return {
        id: sid,
        userId: "u1",
        dateCreated: new Date(date),
        status: "active" as const,
        isAnchor: false,
        modules: [
            {
                type: "exercise",
                id: mid,
                stateId: sid,
                summary: null,
                plan: [
                    {
                        id: pid,
                        meta: {
                            type: "exercise",
                            name: "Walk",
                            intensity: "blue",
                        },
                        data: { aerobic: { goal, value: 0, unit: "minutes" } },
                    },
                ],
                checklists: [],
                progress: {
                    id: `prog-${mid}`,
                    moduleId: mid,
                    summary: null,
                    trackables: [
                        {
                            id: pid,
                            meta: {
                                type: "exercise",
                                name: "Walk",
                                intensity: "blue",
                            },
                            data: {
                                aerobic: {
                                    goal,
                                    value: complete ? goal : 0,
                                    unit: "minutes",
                                },
                            },
                        },
                    ],
                    checklistState: {},
                },
            },
        ],
    };
}

/** Symptom-module state with a specific pain value (0–10). */
function symptomState(date: string, pain: number, id?: string): State {
    const sid = id ?? `state-${date}`;
    const mid = `sym-${sid}`;
    const pid = `sym-p-${sid}`;
    return {
        id: sid,
        userId: "u1",
        dateCreated: new Date(date),
        status: "active" as const,
        isAnchor: false,
        modules: [
            {
                type: "symptoms",
                id: mid,
                stateId: sid,
                summary: null,
                plan: [
                    {
                        id: pid,
                        meta: { type: "symptoms", name: "Pain" },
                        data: {
                            pain: {
                                goal: 0,
                                value: pain,
                                unit: "level",
                                location: "Knee",
                                type: "pain",
                                frequency: "constant",
                            },
                        },
                    },
                ],
                checklists: [],
                progress: {
                    id: `prog-${mid}`,
                    moduleId: mid,
                    summary: null,
                    trackables: [
                        {
                            id: pid,
                            meta: { type: "symptoms", name: "Pain" },
                            data: {
                                pain: {
                                    goal: 0,
                                    value: pain,
                                    unit: "level",
                                    location: "Knee",
                                    type: "pain",
                                    frequency: "constant",
                                },
                            },
                        },
                    ],
                    checklistState: {},
                },
            },
        ],
    };
}

const SURGERY = new Date("2026-06-01T00:00:00.000Z");

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("buildHeuristicDigest — recovery day and phase", () => {
    it("shows the correct recovery day and phase when surgery date is set", () => {
        // Day 14 post-op = early recovery phase
        // getRecoveryDay is 1-indexed: surgery day = day 1, so 14 days later = day 15
        const now = new Date("2026-06-15T12:00:00.000Z");
        const digest = buildHeuristicDigest({
            history: [],
            surgeryDate: SURGERY,
            now,
        });
        expect(digest).toContain("Recovery day: 15");
        expect(digest).toContain("phase:");
    });

    it("shows unknown recovery day when no surgery date", () => {
        const digest = buildHeuristicDigest({
            history: [],
            surgeryDate: null,
        });
        expect(digest).toContain("unknown (no surgery date on file)");
    });
});

describe("buildHeuristicDigest — adherence streak", () => {
    it("shows a 3-day streak when three consecutive complete days are logged", () => {
        const history = [
            exerciseState("2026-06-10", true),
            exerciseState("2026-06-11", true),
            exerciseState("2026-06-12", true),
        ];
        const digest = buildHeuristicDigest({
            history,
            surgeryDate: SURGERY,
            now: new Date("2026-06-15"),
        });
        expect(digest).toContain("Adherence streak: 3 day(s)");
        expect(digest).toContain("Days with a full plan completed: 3 of 3");
    });

    it("forgives a single missed day — streak still counts", () => {
        const history = [
            exerciseState("2026-06-10", true),
            exerciseState("2026-06-11", false), // missed
            exerciseState("2026-06-12", true),
            exerciseState("2026-06-13", true),
        ];
        const digest = buildHeuristicDigest({
            history,
            surgeryDate: SURGERY,
            now: new Date("2026-06-15"),
        });
        // 3 complete, 1 missed — streak forgives the single miss
        expect(digest).toContain("Days with a full plan completed: 3 of 4");
        // Streak should be 3 (C M C C), forgiven
        expect(digest).toMatch(/Adherence streak: 3 day\(s\)/);
    });

    it("shows a reset when the latest entries are two consecutive misses", () => {
        // streak resets only when the sequence ENDS on 2 misses (getStreak scans oldest→newest)
        const history = [
            exerciseState("2026-06-10", true),
            exerciseState("2026-06-11", true),
            exerciseState("2026-06-12", false),
            exerciseState("2026-06-13", false), // ends on 2 misses → reset
        ];
        const digest = buildHeuristicDigest({
            history,
            surgeryDate: SURGERY,
            now: new Date("2026-06-15"),
        });
        expect(digest).toContain("just reset after 2 missed days");
    });

    it("shows adherence percentage when enough history exists", () => {
        const history = [
            exerciseState("2026-06-09", true),
            exerciseState("2026-06-10", true),
            exerciseState("2026-06-11", true),
            exerciseState("2026-06-12", false),
            exerciseState("2026-06-13", true),
            exerciseState("2026-06-14", true),
            exerciseState("2026-06-15", false),
        ];
        const digest = buildHeuristicDigest({
            history,
            surgeryDate: SURGERY,
            now: new Date("2026-06-16"),
        });
        expect(digest).toContain("Plan adherence:");
        expect(digest).toContain("last 7d");
    });
});

describe("buildHeuristicDigest — pain stagnation flag (the key AI-over-hardcoded signal)", () => {
    /**
     * Scenario: Patient completes exercises every day (compliance is fine) but pain
     * has been stuck at 6/10 for four consecutive days.
     *
     * A hardcoded rule keyed only on compliance would see "100% adherence → progress plan."
     * The digest hands the LLM the full picture: high compliance + pain plateau.
     * The LLM can then reason that progression is inappropriate until pain resolves —
     * something a compliance-only rule would miss.
     */
    it("fires a pain_stagnation warning when pain is flat for ≥3 days", () => {
        const surgeryDate = new Date("2026-06-01");
        const history = [
            symptomState("2026-06-05", 6),
            symptomState("2026-06-06", 6),
            symptomState("2026-06-07", 6),
            symptomState("2026-06-08", 6),
        ];
        const digest = buildHeuristicDigest({
            history,
            surgeryDate,
            now: new Date("2026-06-09"),
        });
        // ⚠ flag fires; title is "Pain not decreasing" (internal kind is "pain_stagnation")
        expect(digest).toContain("⚠");
        expect(digest).toContain("not decreasing");
    });

    it("does NOT fire the flag when pain is trending down", () => {
        const surgeryDate = new Date("2026-06-01");
        const history = [
            symptomState("2026-06-05", 7),
            symptomState("2026-06-06", 6),
            symptomState("2026-06-07", 5),
            symptomState("2026-06-08", 4),
        ];
        const digest = buildHeuristicDigest({
            history,
            surgeryDate,
            now: new Date("2026-06-09"),
        });
        expect(digest).not.toContain("⚠");
    });

    it("includes the pain delta vs baseline so the LLM can detect regression", () => {
        const surgeryDate = new Date("2026-06-01");
        const history = [
            symptomState("2026-06-05", 4, "s1"), // baseline
            symptomState("2026-06-06", 6, "s2"), // worse
        ];
        const digest = buildHeuristicDigest({
            history,
            surgeryDate,
            now: new Date("2026-06-07"),
        });
        // The digest must include baseline and current readings for the LLM to compare
        expect(digest).toContain("baseline");
        expect(digest).toContain("worse than baseline");
    });

    it("reports 'improving vs baseline' when pain decreases", () => {
        const surgeryDate = new Date("2026-06-01");
        const history = [
            symptomState("2026-06-05", 7, "s1"),
            symptomState("2026-06-06", 4, "s2"),
        ];
        const digest = buildHeuristicDigest({
            history,
            surgeryDate,
            now: new Date("2026-06-07"),
        });
        expect(digest).toContain("improving vs baseline");
    });

    it("shows 'no pain logged yet' when no symptom module history exists", () => {
        // Exercise-only history: compliance is trackable but no pain data
        const history = [
            exerciseState("2026-06-05", true),
            exerciseState("2026-06-06", true),
        ];
        const digest = buildHeuristicDigest({
            history,
            surgeryDate: SURGERY,
            now: new Date("2026-06-07"),
        });
        expect(digest).toContain("no pain logged yet");
    });
});

describe("buildHeuristicDigest — digest preamble (LLM grounding)", () => {
    it("opens with the 'treat as ground truth' instruction", () => {
        const digest = buildHeuristicDigest({
            history: [],
            surgeryDate: SURGERY,
        });
        // The preamble is how the LLM knows not to re-derive these numbers itself
        expect(digest).toContain("treat as ground truth");
    });

    it("includes RECOVERY SIGNALS header so the LLM can locate this block in the prompt", () => {
        const digest = buildHeuristicDigest({
            history: [],
            surgeryDate: SURGERY,
        });
        expect(digest).toContain("RECOVERY SIGNALS");
    });
});
