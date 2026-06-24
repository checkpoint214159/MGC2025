import { generateObject } from "ai";
import { getModel, LLM_MAX_RETRIES } from "@/lib/llm/model";
import { getModuleBlueprint } from "@/lib/state/services/mapping";
import { anthropicSafeSchema } from "@/lib/llm/utils";

// Prompt-cache breakpoint (Anthropic via OpenRouter). See lib/onboarding/questioning.ts.
const CACHE_BREAKPOINT = {
    openrouter: { cacheControl: { type: "ephemeral" as const } },
};

/** The compacted, shared context for a generation — identical across all modules in a run. */
export interface ModuleContext {
    memoryBlock: string; // rendered patient memory (stable facts + phase narrative)
    digest: string; // deterministic heuristic signals (pain trend, adherence, baseline)
    rawWindow: string; // unconsolidated prose since the memory watermark
}

/**
 * generateModule — one LLM call producing a single module's "blueprint" (the plan portion
 * of a State module) as schema-validated JSON. Called once per module key, in parallel,
 * from the generate_module graph node.
 *
 * The prompt is built in four layers, ordered for Anthropic prompt caching. Layers 1–3 are
 * byte-identical across every parallel module call in a generation (and stable across days
 * until memory/logs change), so they cache as a shared prefix read at ~0.1× after the first:
 *   1. staticSystemPrompt          — patient-agnostic instructions, identical for every call.
 *   2. memory + heuristic digest   — the COMPACTED history. Replaces the old full-transcript
 *                                    blob: consolidated facts/narrative + code-computed signals.
 *   3. raw window                  — the small slice of unconsolidated prose, for recency.
 *   4. roleSpecificPrompt          — the volatile per-module tail (role + previous state +
 *      + previous state + task       "generate now"), AFTER the breakpoints so it never busts
 *                                    the cached prefix.
 *
 * The schema passes through anthropicSafeSchema() (strips JSON-Schema keywords Anthropic's
 * constrained decoding rejects); the model's output is still validated against the full Zod
 * schema. Retries = LLM_MAX_RETRIES (0 in dev). Returns the validated blueprint object.
 */
export async function generateModule(
    moduleKey: string,
    ctx: ModuleContext,
    prevState: any,
) {
    const { schema, staticSystemPrompt, roleSpecificPrompt } =
        getModuleBlueprint(moduleKey);

    const prefixChars =
        staticSystemPrompt.length +
        ctx.memoryBlock.length +
        ctx.digest.length +
        ctx.rawWindow.length;
    const startedAt = Date.now();
    console.log(
        `[llm] ▶ generateModule "${moduleKey}" | model=${
            process.env.AI_MODEL ?? "anthropic/claude-sonnet-4"
        } | ` +
            `cached prefix ≈ ${prefixChars} chars ` +
            `(system ${staticSystemPrompt.length} + memory ${ctx.memoryBlock.length} + digest ${ctx.digest.length} + raw ${ctx.rawWindow.length}) | ` +
            `volatile: role ${roleSpecificPrompt.length} chars, prevState ${
                prevState ? "present" : "none"
            }`,
    );

    const { object } = await generateObject({
        model: getModel(),
        // Strip Zod-4's `propertyNames` (from z.record/.catchall in the category schemas),
        // which Anthropic's structured-output mode rejects.
        schema: anthropicSafeSchema(schema),
        maxRetries: LLM_MAX_RETRIES,
        messages: [
            // 1. Static system prompt — identical across ALL patients and regenerations.
            {
                role: "system",
                content: staticSystemPrompt,
                providerOptions: CACHE_BREAKPOINT,
            },
            // 2. Compacted history — consolidated memory + deterministic signals. Shared across modules.
            {
                role: "user",
                content: `${ctx.memoryBlock}\n\n${ctx.digest}`,
                providerOptions: CACHE_BREAKPOINT,
            },
            // 3. Recent raw prose since the last consolidation (recency ground truth). Shared across modules.
            {
                role: "user",
                content: `RECENT NOTES (raw, since last consolidation):\n${
                    ctx.rawWindow || "None."
                }`,
                providerOptions: CACHE_BREAKPOINT,
            },
            // 4. Volatile, per-module tail (after the breakpoints): role instructions + prior state + task.
            {
                role: "user",
                content: `${roleSpecificPrompt}\n\nPREVIOUS ${moduleKey.toUpperCase()} STATE: ${
                    prevState
                        ? JSON.stringify(prevState)
                        : "No previous state. This is a fresh start."
                }\n\nGenerate the ${moduleKey} recovery blueprint now.`,
            },
        ],
    });

    console.log(
        `[llm] ✓ generateModule "${moduleKey}" done (${
            Date.now() - startedAt
        }ms)`,
    );
    return object;
}
