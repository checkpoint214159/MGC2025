/**
 * Lightweight LLM usage recorder. Every generateObject/generateText call flows through
 * the wrapGenerate middleware in model.ts and lands here. Emits a structured
 * `[llm-usage] <JSON>` line to the server log, which usage-report.mjs can aggregate.
 *
 * Pricing table (USD per 1M tokens, OpenRouter posted rates as of 2026-06):
 * Update this when you change models or OpenRouter adjusts pricing.
 */

interface UsageEntry {
    model: string;
    promptTokens: number;
    completionTokens: number;
    cacheReadTokens: number;
    durationMs: number;
}

// USD per 1M tokens: [inputRate, outputRate, cacheReadRate]
const PRICING: Record<string, [number, number, number]> = {
    "anthropic/claude-sonnet-4.5": [3.0, 15.0, 0.3],
    "anthropic/claude-sonnet-4": [3.0, 15.0, 0.3],
    "anthropic/claude-opus-4": [15.0, 75.0, 1.5],
    "anthropic/claude-haiku-4.5": [0.8, 4.0, 0.08],
    "deepseek/deepseek-chat": [0.27, 1.1, 0.027],
};

function estimateCost(entry: UsageEntry): number {
    const rates = PRICING[entry.model] ??
        PRICING["anthropic/claude-sonnet-4"] ?? [3.0, 15.0, 0.3];
    const [inputRate, outputRate, cacheRate] = rates;
    const nonCachedInput = Math.max(
        0,
        entry.promptTokens - entry.cacheReadTokens,
    );
    return (
        (nonCachedInput * inputRate +
            entry.completionTokens * outputRate +
            entry.cacheReadTokens * cacheRate) /
        1_000_000
    );
}

export function recordLLMUsage(entry: UsageEntry): void {
    const cost = estimateCost(entry);
    const cacheHitPct =
        entry.promptTokens > 0
            ? Math.round((entry.cacheReadTokens / entry.promptTokens) * 100)
            : 0;

    console.log(
        `[llm-usage] ${JSON.stringify({
            model: entry.model,
            in: entry.promptTokens,
            out: entry.completionTokens,
            cacheRead: entry.cacheReadTokens,
            cacheHitPct,
            costUsd: Number(cost.toFixed(6)),
            ms: entry.durationMs,
            ts: new Date().toISOString(),
        })}`,
    );
}
