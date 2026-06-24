import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { wrapLanguageModel } from "ai";

// Single OpenRouter provider for all LLM calls (replaces the Vercel AI Gateway).
// Reads OPENROUTER_API_KEY from the environment.
const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

// Cap output tokens so OpenRouter only RESERVES credit for what we actually use.
// With max_tokens unset, OpenRouter reserves the model's ceiling (e.g. Claude
// Sonnet 4 = 64k → ~$1/call held), which causes 402s and risks runaway cost.
const DEFAULT_MAX_OUTPUT_TOKENS =
    Number(process.env.LLM_MAX_OUTPUT_TOKENS) || 16384;

// AI-SDK retry count for object generation. 0 = single attempt (no retries) — the dev
// default, because a schema/validation failure almost always repeats and just multiplies
// cost. Set LLM_MAX_RETRIES=2 in prod (wrangler vars) for resilience against transient 5xx.
export const LLM_MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES ?? 0);

/**
 * Returns a language model from OpenRouter, with a default output-token cap.
 * @param modelId Optional OpenRouter model slug (e.g. "deepseek/deepseek-chat").
 *                Defaults to AI_MODEL env, then a sensible fallback.
 */
export function getModel(modelId?: string) {
    const id = modelId ?? process.env.AI_MODEL ?? "anthropic/claude-sonnet-4";
    return wrapLanguageModel({
        model: openrouter(id),
        middleware: {
            // Apply the cap only when a call hasn't set its own maxOutputTokens.
            transformParams: async ({ params }) => ({
                ...params,
                maxOutputTokens:
                    params.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
            }),
        },
    });
}
