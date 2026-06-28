import { StateGenerationLangGraphState } from "@/lib/state/graph/annotation";
import { assembleGenerationContext } from "@/lib/state/services/generation-context";
import { createLogger } from "@/lib/logger";

const log = createLogger("state-gen");

/**
 * Node: load_context
 *
 * Thin wrapper over assembleGenerationContext() (lib/state/services/generation-context.ts),
 * which builds the three cached, byte-identical context layers shared across every parallel
 * module call:
 *   1. patientMemory   — two-tier consolidated memory (stable facts + per-phase narrative).
 *   2. heuristicDigest — deterministic signals + rolling 7d/14d/30d trends (TODO 9.2).
 *   3. rawWindow       — unconsolidated prose since the memory watermark.
 * Plus `previousState` (most recent prior state) for structural carry-forward.
 *
 * Emits a structured `[memory] {…}` observability line (TODO item 10): layer sizes, memory
 * content/provenance, and the compaction ratio (full transcript vs compacted context). Parsed
 * by `npm run memory`; also returned over HTTP by the dev `context` op.
 */
export async function loadContextNode(
    state: StateGenerationLangGraphState,
): Promise<Partial<StateGenerationLangGraphState>> {
    const genDate = new Date(state.date);
    const ctx = await assembleGenerationContext(state.userId, genDate);
    const o = ctx.observability;

    // Structured, machine-parseable snapshot (mirrors the [llm-usage] convention).
    log.info(
        `[memory] ${JSON.stringify({
            userId: state.userId,
            date: genDate.toISOString().slice(0, 10),
            recoveryDay: o.recoveryDay,
            phase: o.recoveryPhase,
            statesInHistory: o.statesInHistory,
            metricRows: o.metricRows,
            memoryChars: o.memory.totalChars,
            semanticChars: o.memory.semanticChars,
            episodic: o.memory.episodic,
            digestChars: o.digestChars,
            rollingChars: o.rollingTrendChars,
            rawWindowChars: o.rawWindow.chars,
            rawWindowMsgs: o.rawWindow.messages,
            hasDoctorNote: o.rawWindow.hasDoctorNote,
            profileInSemantic: o.memory.profileInSemantic,
            fullTranscriptChars: o.fullTranscriptChars,
            conversationalContextChars: o.conversationalContextChars,
            compactedContextChars: o.compactedContextChars,
            compactionRatio: o.compactionRatio,
        })}`,
    );

    // Human-readable one-liner for live tailing.
    log.info(
        `✓ load_context | day ${o.recoveryDay ?? "?"} (${o.recoveryPhase}) | ` +
            `memory ${o.memory.totalChars}c (sem ${o.memory.semanticChars} + ${o.memory.episodic.length} phase) | ` +
            `digest ${o.digestChars}c (rolling ${o.rollingTrendChars}) | raw ${o.rawWindow.chars}c/${o.rawWindow.messages}msg | ` +
            `compaction ${o.compactionRatio}× (transcript ${o.fullTranscriptChars}c vs conversational ${o.conversationalContextChars}c) | ` +
            `prevState ${ctx.previousState ? "yes" : "none"}`,
    );

    return {
        previousState: ctx.previousState,
        contextMetadata: o as unknown as Record<string, unknown>,
        patientMemory: ctx.patientMemory,
        heuristicDigest: ctx.heuristicDigest,
        rawWindow: ctx.rawWindow,
        recoveryDay: ctx.recoveryDay,
        recoveryPhase: ctx.recoveryPhase,
    };
}
