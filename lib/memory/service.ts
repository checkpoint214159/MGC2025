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
 * generated profile. Idempotent — find-then-create (single-row writes only).
 *
 * NOTE: this previously used `upsert` with an empty `update: {}` ("create if absent, else
 * leave alone"). Prisma can't compile an empty ON CONFLICT DO UPDATE, so it falls back to a
 * SELECT-then-write transaction — which the Neon HTTP driver rejects ("Transactions are not
 * supported in HTTP mode"). This crashed onboarding completion (save_profile). Upserts with a
 * non-empty `update` are fine on HTTP; an empty one is not.
 */
export async function seedPatientMemory(
    userId: string,
    profile: string,
): Promise<void> {
    // Don't clobber an existing memory if onboarding is re-run.
    const existing = await prisma.patientMemory.findUnique({
        where: { userId },
    });
    if (existing) return;
    await prisma.patientMemory.create({
        data: {
            userId,
            semantic: profile,
            episodic: [],
            consolidatedThrough: new Date(),
        },
    });
}

/**
 * Persist a consolidated memory: append an immutable version snapshot to the audit trail,
 * then update the "current" pointer. Two single-row writes (the Neon HTTP adapter has no
 * transactions); the version is written first so the history is captured even if the second
 * write fails. `trigger` records what prompted the pass (for the audit trail).
 */
export async function persistPatientMemory(
    userId: string,
    memory: PatientMemory,
    meta?: { trigger?: string },
): Promise<void> {
    // 1. Append-only version snapshot (full state AFTER this consolidation).
    await prisma.patientMemoryVersion.create({
        data: {
            userId,
            semantic: memory.semantic,
            episodic: memory.episodic as unknown as object,
            consolidatedThrough: memory.consolidatedThrough,
            trigger: meta?.trigger ?? null,
        },
    });

    // 2. Update the latest-pointer row (1:1 with the patient). A non-empty `update`
    //    clause compiles to a native INSERT…ON CONFLICT DO UPDATE (single statement,
    //    HTTP-safe) — unlike an empty `update: {}`, which forces a transaction.
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

/**
 * The patient's memory history, newest → oldest, for audit/traceability views.
 */
export async function getPatientMemoryVersions(userId: string) {
    return prisma.patientMemoryVersion.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });
}
