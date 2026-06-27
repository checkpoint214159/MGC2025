import { consolidateMemory } from "@/lib/memory/consolidate";
import { applyConsolidation, persistPatientMemory } from "@/lib/memory/service";
import { StateGenerationLangGraphState } from "@/lib/state/graph/annotation";

/**
 * Node: consolidate_memory (conditional)
 *
 * Runs ONLY when the raw window crossed the threshold or a doctor note landed (see the
 * routeAfterContext router in graph.ts). Folds the unconsolidated prose into the patient's
 * long-running memory via a single structured LLM call, then advances the watermark.
 *
 * The model proposes; this node disposes (applyConsolidation enforces the erosion guards) and
 * persists. FAIL-SAFE: any error keeps the prior memory and leaves the raw window intact (it's
 * still fed verbatim to plan-gen), so a bad consolidation never corrupts memory or loses data.
 *
 * On success the raw window is cleared from graph state — it now lives in memory, so plan-gen
 * reads the compacted version instead of the full prose (the whole point: cost goes down).
 */
export async function consolidateMemoryNode(
    state: StateGenerationLangGraphState,
): Promise<Partial<StateGenerationLangGraphState>> {
    if (!state.patientMemory || state.rawWindow.messageCount === 0) return {};

    try {
        const output = await consolidateMemory({
            prior: state.patientMemory,
            rawWindow: state.rawWindow.text,
            heuristicDigest: state.heuristicDigest,
            currentPhase: state.recoveryPhase,
            recoveryDay: state.recoveryDay,
        });

        const updated = applyConsolidation({
            prior: state.patientMemory,
            output,
            currentPhase: state.recoveryPhase,
            newWatermark: state.rawWindow.newestAt ?? new Date(),
        });

        await persistPatientMemory(state.userId, updated, {
            trigger: state.rawWindow.hasDoctorNote
                ? "doctor_note"
                : "threshold",
        });
        console.log(
            `[state-gen] ✓ consolidated memory | +${output.newSemanticFacts.length} fact(s) | ` +
                `phase=${state.recoveryPhase} | window folded (${state.rawWindow.messageCount} msg)`,
        );

        return {
            patientMemory: updated,
            rawWindow: {
                text: "",
                newestAt: state.rawWindow.newestAt,
                messageCount: 0,
                hasDoctorNote: false,
            },
        };
    } catch (err) {
        console.error(
            "[state-gen] ✗ consolidation failed — keeping prior memory + raw window:",
            err,
        );
        return {};
    }
}
