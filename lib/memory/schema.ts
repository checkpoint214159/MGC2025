import { z } from "zod";
import type { RecoveryPhase } from "@/lib/engagement";

/**
 * Schemas for the two-tier PATIENT MEMORY (see prisma `PatientMemory`).
 *
 *   - semantic: stable clinical facts, carried forward verbatim by code (erosion-proof).
 *   - episodic: the recovery NARRATIVE, split into per-phase sections. A closed phase's
 *     section is frozen and never regenerated.
 *
 * Plus ConsolidationOutputSchema — the strict shape the LLM returns from a consolidation
 * pass. The model only PROPOSES (new facts + the current phase's narrative); the node
 * disposes (appends facts, freezes old phases). The model never holds the pen on the
 * persisted record, so a bad generation can't erase or rewrite established memory.
 */

// Mirror the literals of engagement's RecoveryPhase. The `satisfies` makes the compiler
// fail here if engagement ever adds/renames a phase, instead of drifting silently.
export const RECOVERY_PHASES = ["early", "re-engagement", "late"] as const;
type _PhaseParity = (typeof RECOVERY_PHASES)[number] extends RecoveryPhase
    ? RecoveryPhase extends (typeof RECOVERY_PHASES)[number]
        ? true
        : never
    : never;
export const _phaseParity: _PhaseParity = true;

export const RecoveryPhaseSchema = z.enum(RECOVERY_PHASES);

export const EpisodicSectionSchema = z.object({
    phase: RecoveryPhaseSchema,
    narrative: z.string(),
    // Once the patient has moved past this phase, its section is frozen (never rewritten).
    closed: z.boolean().default(false),
});
export type EpisodicSection = z.infer<typeof EpisodicSectionSchema>;

export const PatientMemorySchema = z.object({
    semantic: z.string().default(""),
    episodic: z.array(EpisodicSectionSchema).default([]),
    consolidatedThrough: z.coerce.date(),
});
export type PatientMemory = z.infer<typeof PatientMemorySchema>;

/** What the LLM returns from one consolidation pass. Deliberately minimal. */
export const ConsolidationOutputSchema = z.object({
    // New STABLE facts discovered in the raw window that aren't already in semantic memory
    // (e.g. a newly reported allergy, a medication change, a new diagnosis). One per string.
    // The node APPENDS these; it never lets the model rewrite existing semantic facts.
    newSemanticFacts: z
        .array(z.string())
        .describe(
            "New stable clinical facts to append. Empty if nothing durable was learned.",
        ),
    // The rewritten narrative for the CURRENT (open) recovery phase only. Closed phases are
    // not touched. Should fold the raw window into the prior narrative for this phase.
    currentPhaseNarrative: z
        .string()
        .describe(
            "The updated qualitative narrative for the current recovery phase.",
        ),
});
export type ConsolidationOutput = z.infer<typeof ConsolidationOutputSchema>;
