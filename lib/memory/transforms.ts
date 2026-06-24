import type { RecoveryPhase } from "@/lib/engagement";
import {
    RECOVERY_PHASES,
    type PatientMemory,
    type EpisodicSection,
    type ConsolidationOutput,
} from "./schema";

/**
 * PURE transforms for the two-tier PATIENT MEMORY — no DB, no LLM, no React, so they stay
 * unit-testable like lib/engagement. DB I/O lives in ./service (which re-exports these); the
 * consolidation LLM call lives in ./consolidate.
 */

// Char threshold on the unconsolidated raw window that triggers a consolidation pass. A rough
// proxy for tokens (~4 chars/token → ~1k tokens). Tune against a real transcript; it's the one
// magic number the design left open.
export const CONSOLIDATION_CHAR_THRESHOLD = Number(
    process.env.MEMORY_CONSOLIDATION_CHAR_THRESHOLD ?? 4000,
);

const phaseIndex = (p: RecoveryPhase): number => RECOVERY_PHASES.indexOf(p);

// ---------------------------------------------------------------------------
// Raw window (unconsolidated prose since the watermark)
// ---------------------------------------------------------------------------

type MessageLike = { role: string; content: string; createdAt: Date | string };
type ThreadLike = {
    title?: string | null;
    type?: string | null;
    messages?: MessageLike[] | null;
};

export type RawWindow = {
    text: string;
    newestAt: Date | null;
    messageCount: number;
    hasDoctorNote: boolean;
};

/** The verbatim prose accumulated since `since` — fed to plan-gen and folded in on consolidation. */
export function buildRawWindow(threads: ThreadLike[], since: Date): RawWindow {
    let newestAt: Date | null = null;
    let messageCount = 0;
    let hasDoctorNote = false;
    const blocks: string[] = [];

    for (const thread of threads ?? []) {
        const fresh = (thread.messages ?? []).filter(
            (m) => new Date(m.createdAt) > since,
        );
        if (fresh.length === 0) continue;
        if (thread.type === "doctor_note") hasDoctorNote = true;
        messageCount += fresh.length;
        for (const m of fresh) {
            const at = new Date(m.createdAt);
            if (!newestAt || at > newestAt) newestAt = at;
        }
        const body = fresh
            .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
            .join("\n");
        blocks.push(
            `### Thread: ${thread.title || thread.type || "General"}\n${body}`,
        );
    }

    return {
        text: blocks.join("\n\n---\n\n"),
        newestAt,
        messageCount,
        hasDoctorNote,
    };
}

/** Volume- or event-triggered: consolidate when the window is large OR a doctor note landed. */
export function shouldConsolidate(
    window: RawWindow,
    threshold = CONSOLIDATION_CHAR_THRESHOLD,
): boolean {
    if (window.messageCount === 0) return false;
    return window.text.length >= threshold || window.hasDoctorNote;
}

// ---------------------------------------------------------------------------
// Rendering for the plan-gen prompt (cached prefix)
// ---------------------------------------------------------------------------

/** The memory block injected into plan-gen — stable facts then the phase-ordered narrative. */
export function renderMemoryForPrompt(memory: PatientMemory | null): string {
    if (!memory) return "PATIENT MEMORY: none on file yet.";
    const parts: string[] = [];
    if (memory.semantic.trim()) {
        parts.push(`STABLE CLINICAL FACTS:\n${memory.semantic.trim()}`);
    }
    const ordered = [...memory.episodic].sort(
        (a, b) => phaseIndex(a.phase) - phaseIndex(b.phase),
    );
    const narrative = ordered
        .filter((s) => s.narrative.trim())
        .map(
            (s) =>
                `[${s.phase}]${
                    s.closed ? " (closed)" : ""
                }: ${s.narrative.trim()}`,
        )
        .join("\n");
    if (narrative) parts.push(`RECOVERY NARRATIVE:\n${narrative}`);
    return parts.length
        ? `PATIENT MEMORY:\n${parts.join("\n\n")}`
        : "PATIENT MEMORY: none on file yet.";
}

// ---------------------------------------------------------------------------
// The node "disposes" — apply the model's proposal safely
// ---------------------------------------------------------------------------

/**
 * Fold a consolidation result into prior memory. PURE — the caller persists the return value.
 *
 * Erosion guards live here, not in the model:
 *   - existing semantic facts are NEVER rewritten; new facts are appended (with cheap dedup).
 *   - phases earlier than the current one are frozen (`closed: true`) and never touched.
 *   - only the current phase's narrative is (re)written.
 */
export function applyConsolidation(opts: {
    prior: PatientMemory;
    output: ConsolidationOutput;
    currentPhase: RecoveryPhase;
    newWatermark: Date;
}): PatientMemory {
    const { prior, output, currentPhase, newWatermark } = opts;

    // 1. Semantic tier: append only genuinely-new facts (substring dedup against current memory).
    const existing = prior.semantic;
    const additions = output.newSemanticFacts
        .map((f) => f.trim())
        .filter((f) => f.length > 0 && !existing.includes(f));
    const semantic = additions.length
        ? [existing.trim(), ...additions.map((f) => `- ${f}`)]
              .filter(Boolean)
              .join("\n")
        : existing;

    // 2. Episodic tier: freeze earlier phases, upsert the current phase's narrative.
    const curIdx = phaseIndex(currentPhase);
    const episodic: EpisodicSection[] = prior.episodic.map((s) =>
        phaseIndex(s.phase) < curIdx ? { ...s, closed: true } : s,
    );
    const idx = episodic.findIndex((s) => s.phase === currentPhase);
    if (idx >= 0) {
        episodic[idx] = {
            ...episodic[idx],
            narrative: output.currentPhaseNarrative,
            closed: false,
        };
    } else {
        episodic.push({
            phase: currentPhase,
            narrative: output.currentPhaseNarrative,
            closed: false,
        });
    }

    return { semantic, episodic, consolidatedThrough: newWatermark };
}
