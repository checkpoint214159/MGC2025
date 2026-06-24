/**
 * Feature flags for the engagement revamp. `reviewedBy` and `caregiverMode` ship
 * as polished UI backed by mock data this pass; `physioSignoff` (the real physio
 * review pipeline) stays off until the backend exists. Override via NEXT_PUBLIC_*.
 */
export const FLAGS = {
    reviewedBy: process.env.NEXT_PUBLIC_FLAG_REVIEWED_BY !== "false",
    caregiverMode: process.env.NEXT_PUBLIC_FLAG_CAREGIVER !== "false",
    physioSignoff: process.env.NEXT_PUBLIC_FLAG_PHYSIO_SIGNOFF === "true",
} as const;
