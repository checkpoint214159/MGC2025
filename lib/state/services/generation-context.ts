import { prisma } from "@/lib/prisma";
import { getStateHistory } from "@/lib/state/service";
import type { State } from "@/lib/state/schemas/state";
import type { PatientMemory } from "@/lib/memory/schema";
import {
    getPatientMemory,
    buildRawWindow,
    type RawWindow,
} from "@/lib/memory/service";
import { buildHeuristicDigest } from "@/lib/state/services/digest";
import { buildRollingTrends } from "@/lib/memory/rolling";
import { getDailyMetrics } from "@/lib/metrics/service";
import {
    getRecoveryDay,
    getRecoveryPhase,
    type RecoveryPhase,
} from "@/lib/engagement";

/**
 * Assemble the COMPACTED plan-generation context for one day — the single source of truth for
 * both the graph's load_context node and the dev observability op. Pure-ish (DB reads only, no
 * LLM, no writes), so it can be called to *inspect* the context without generating a plan.
 *
 * Alongside the context it returns an `observability` snapshot (TODO item 10): the size of each
 * layer, the actual memory content + provenance, and the COMPACTION RATIO — how large the full
 * raw transcript would be versus the compacted context we actually send. That ratio is the
 * headline "is the memory system earning its keep?" metric: the transcript grows without bound
 * as the patient logs, but the compacted context stays roughly flat, so the ratio should climb.
 */

export interface MemoryObservability {
    recoveryDay: number | null;
    recoveryPhase: RecoveryPhase;
    statesInHistory: number;
    metricRows: number;
    memory: {
        present: boolean;
        semanticChars: number;
        episodic: { phase: string; chars: number; closed: boolean }[];
        totalChars: number;
        // The semantic tier is SEEDED from the onboarding profile, so "is the profile included?"
        // → yes, it lives inside semantic memory (not sent separately to plan-gen).
        profileInSemantic: boolean;
    };
    digestChars: number;
    rollingTrendChars: number;
    rawWindow: {
        chars: number;
        messages: number;
        hasDoctorNote: boolean;
        consolidatedThrough: string | null;
    };
    // Compaction. The memory + raw window are what REPLACE the full conversation transcript in
    // the prompt (the digest is computed overhead common to either approach, so it's excluded
    // from the ratio). Early on (no memory, raw window ≈ the whole transcript) the ratio sits
    // near 1; as memory absorbs more conversation while the raw window stays bounded, it climbs.
    fullTranscriptChars: number; // all thread messages, verbatim (the un-compacted alternative)
    conversationalContextChars: number; // memory + raw window (what we actually send instead)
    compactedContextChars: number; // conversational + digest (the full sent context size)
    compactionRatio: number; // fullTranscriptChars / max(1, conversationalContextChars)
}

export interface GenerationContext {
    previousState: State | null;
    patientMemory: PatientMemory | null;
    heuristicDigest: string;
    rawWindow: RawWindow;
    recoveryDay: number | null;
    recoveryPhase: RecoveryPhase;
    observability: MemoryObservability;
}

export async function assembleGenerationContext(
    userId: string,
    date: Date,
): Promise<GenerationContext> {
    const genDate = new Date(date);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { threads: { include: { messages: true } }, biometric: true },
    });
    if (!user) throw new Error(`User ${userId} not found`);

    const surgeryDate = user.biometric?.surgeryDate ?? null;
    const recoveryDay = getRecoveryDay({ surgeryDate, today: genDate });
    const recoveryPhase = getRecoveryPhase(recoveryDay);

    // Full active-state chain (read-only). Feeds the digest and yields the most recent prior state.
    const fullHistory = await getStateHistory(userId);
    const previousState =
        [...fullHistory]
            .filter((s) => new Date(s.dateCreated) < genDate)
            .pop() ?? null;

    // Layer 1: deterministic signals + rolling multi-window trends from persisted DailyMetric.
    const digestBase = buildHeuristicDigest({
        history: fullHistory,
        surgeryDate,
        now: genDate,
    });
    const metrics = await getDailyMetrics(userId);
    const rollingTrends = buildRollingTrends(metrics, genDate);
    const heuristicDigest = rollingTrends
        ? `${digestBase}\n\n${rollingTrends}`
        : digestBase;

    // Layer 2: consolidated memory. Layer 3: unconsolidated raw window since the watermark.
    const patientMemory = await getPatientMemory(userId);
    const rawWindow = buildRawWindow(
        user.threads,
        patientMemory?.consolidatedThrough ?? new Date(0),
    );

    // ── Observability ────────────────────────────────────────────────────────
    const memoryBlockChars =
        (patientMemory?.semantic.length ?? 0) +
        (patientMemory?.episodic.reduce((n, s) => n + s.narrative.length, 0) ??
            0);

    // What the un-compacted prompt would carry: every thread message, verbatim.
    const fullTranscriptChars = user.threads.reduce(
        (n, t) =>
            n +
            (t.messages ?? []).reduce(
                (m, msg) => m + (msg.content?.length ?? 0),
                0,
            ),
        0,
    );
    // Memory + raw window replace the full transcript; digest is common overhead.
    const conversationalContextChars = memoryBlockChars + rawWindow.text.length;
    const compactedContextChars =
        conversationalContextChars + heuristicDigest.length;

    const observability: MemoryObservability = {
        recoveryDay,
        recoveryPhase,
        statesInHistory: fullHistory.length,
        metricRows: metrics.length,
        memory: {
            present: !!patientMemory,
            semanticChars: patientMemory?.semantic.length ?? 0,
            episodic: (patientMemory?.episodic ?? []).map((s) => ({
                phase: s.phase,
                chars: s.narrative.length,
                closed: s.closed,
            })),
            totalChars: memoryBlockChars,
            profileInSemantic: !!user.profile,
        },
        digestChars: heuristicDigest.length,
        rollingTrendChars: rollingTrends.length,
        rawWindow: {
            chars: rawWindow.text.length,
            messages: rawWindow.messageCount,
            hasDoctorNote: rawWindow.hasDoctorNote,
            consolidatedThrough:
                patientMemory?.consolidatedThrough.toISOString() ?? null,
        },
        fullTranscriptChars,
        conversationalContextChars,
        compactedContextChars,
        compactionRatio: Number(
            (
                fullTranscriptChars / Math.max(1, conversationalContextChars)
            ).toFixed(2),
        ),
    };

    return {
        previousState,
        patientMemory,
        heuristicDigest,
        rawWindow,
        recoveryDay,
        recoveryPhase,
        observability,
    };
}
