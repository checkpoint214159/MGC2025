import type { DayRecord } from "@/lib/engagement";

/** Display-only reviewing physio (no real sign-off workflow this pass). */
export const MOCK_REVIEWED_BY = {
    name: "Dr. Aisha Rahman",
    title: "Lead Physiotherapist",
};

/** Mock 7-day completion history (oldest → newest) for the streak ring demo. */
export const MOCK_STREAK_HISTORY: DayRecord[] = [
    { date: "d-6", allComplete: true },
    { date: "d-5", allComplete: true },
    { date: "d-4", allComplete: false },
    { date: "d-3", allComplete: true },
    { date: "d-2", allComplete: true },
    { date: "d-1", allComplete: true },
    { date: "d-0", allComplete: false },
];
