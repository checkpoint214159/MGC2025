import { prisma } from "@/lib/prisma";
import { PatientMemorySchema, type PatientMemory } from "./schema";

/**
 * DB I/O for the two-tier PATIENT MEMORY. The graph node owns all reads and writes here; the
 * LLM never touches the DB. Pure transforms (rendering, raw-window, the consolidation disposer)
 * live in ./transforms and are re-exported below so existing imports from "./service" keep
 * working — but they have no prisma dependency, so tests should import them from ./transforms.
 */

export * from "./transforms";

// ---------------------------------------------------------------------------
// DB I/O (single-row writes only — Neon HTTP has no transactions)
// ---------------------------------------------------------------------------

export async function getPatientMemory(
    userId: string,
): Promise<PatientMemory | null> {
    const row = await prisma.patientMemory.findUnique({ where: { userId } });
    if (!row) return null;
    return PatientMemorySchema.parse({
        semantic: row.semantic,
        episodic: row.episodic,
        consolidatedThrough: row.consolidatedThrough,
    });
}

/**
 * Create the patient's memory at the end of onboarding, seeding the semantic tier from the
 * generated profile. Idempotent (upsert is a single INSERT…ON CONFLICT — HTTP-safe).
 */
export async function seedPatientMemory(
    userId: string,
    profile: string,
): Promise<void> {
    await prisma.patientMemory.upsert({
        where: { userId },
        create: {
            userId,
            semantic: profile,
            episodic: [],
            consolidatedThrough: new Date(),
        },
        // Don't clobber an existing memory if onboarding is re-run.
        update: {},
    });
}

export async function persistPatientMemory(
    userId: string,
    memory: PatientMemory,
): Promise<void> {
    await prisma.patientMemory.upsert({
        where: { userId },
        create: {
            userId,
            semantic: memory.semantic,
            episodic: memory.episodic as unknown as object,
            consolidatedThrough: memory.consolidatedThrough,
        },
        update: {
            semantic: memory.semantic,
            episodic: memory.episodic as unknown as object,
            consolidatedThrough: memory.consolidatedThrough,
        },
    });
}
