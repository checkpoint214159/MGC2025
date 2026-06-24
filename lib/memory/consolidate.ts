import { generateObject } from "ai";
import { getModel, LLM_MAX_RETRIES } from "@/lib/llm/model";
import { anthropicSafeSchema } from "@/lib/llm/utils";
import type { RecoveryPhase } from "@/lib/engagement";
import {
    ConsolidationOutputSchema,
    type ConsolidationOutput,
    type PatientMemory,
} from "./schema";
import { renderMemoryForPrompt } from "./service";

// Prompt-cache breakpoint (Anthropic via OpenRouter), as in lib/state/services/modules.ts.
const CACHE_BREAKPOINT = {
    openrouter: { cacheControl: { type: "ephemeral" as const } },
};

const SYSTEM_PROMPT = `
You are a clinical memory consolidator for a post-surgical recovery app. Your job is to fold
recent raw notes into a patient's long-running memory, losing nothing clinically important.

You are given the patient's PRIOR MEMORY (stable facts + a phase-by-phase recovery narrative),
the computed RECOVERY SIGNALS (deterministic — never contradict them), the CURRENT PHASE, and a
RAW WINDOW of new conversation/notes since the last consolidation.

Return two things:
1. newSemanticFacts — ONLY durable, stable clinical facts newly revealed in the raw window that
   are NOT already in the stable facts (e.g. a newly reported allergy, a medication change, a new
   diagnosis, a permanent mobility constraint). Do NOT restate existing facts. Do NOT include
   transient day-to-day events, pain readings, or numbers already in the signals. Empty array if
   nothing durable was learned.
2. currentPhaseNarrative — a concise clinical narrative for the CURRENT phase only. Start from the
   prior narrative for this phase (if any) and integrate the new qualitative events from the raw
   window: complications, clinician guidance, the patient's reported experience, adherence
   barriers, psychological state. Past phases are frozen — do not rewrite them. Do not duplicate
   the deterministic signals; capture the "why" and the qualitative, not the metrics.

Be objective and concise. Do not fabricate. If the raw window is thin, keep the narrative short.
`;

/**
 * One consolidation pass: a SINGLE structured LLM call with no tools and no agent loop.
 *
 * The model only proposes (new facts + the current phase's narrative). The CALLER applies the
 * result via applyConsolidation() and persists it — so a bad generation can't corrupt memory,
 * and on failure the caller simply keeps the prior memory (fail-safe). See the design note in
 * memory/patient-memory-architecture for why this is a plain transformation, not a harness.
 */
export async function consolidateMemory(opts: {
    prior: PatientMemory;
    rawWindow: string;
    heuristicDigest: string;
    currentPhase: RecoveryPhase;
    recoveryDay: number | null;
}): Promise<ConsolidationOutput> {
    const { prior, rawWindow, heuristicDigest, currentPhase, recoveryDay } =
        opts;

    const { object } = await generateObject({
        model: getModel(),
        schema: anthropicSafeSchema(ConsolidationOutputSchema),
        maxRetries: LLM_MAX_RETRIES,
        // Single, careful pass — let the model reason before emitting the structured result.
        providerOptions: { openrouter: { reasoning: { effort: "medium" } } },
        messages: [
            // Cached prefix: instructions + prior memory + signals (stable across the volatile window).
            {
                role: "system",
                content: SYSTEM_PROMPT,
                providerOptions: CACHE_BREAKPOINT,
            },
            {
                role: "user",
                content:
                    `${renderMemoryForPrompt(
                        prior,
                    )}\n\n${heuristicDigest}\n\n` +
                    `CURRENT PHASE: ${currentPhase}${
                        recoveryDay !== null
                            ? ` (recovery day ${recoveryDay})`
                            : ""
                    }`,
                providerOptions: CACHE_BREAKPOINT,
            },
            // Volatile tail: the new prose to fold in.
            {
                role: "user",
                content: `RAW WINDOW (new notes since last consolidation):\n${rawWindow}`,
            },
        ],
    });

    return ConsolidationOutputSchema.parse(object);
}
