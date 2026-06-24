import { prisma } from "@/lib/prisma";

/**
 * StateGenerationConfig: Controls the behavior of the state generation graph.
 *
 * This config is:
 * - Stored in the database (table: GraphConfig)
 * - Can be mutated at runtime (no redeployment needed)
 * - Falls back to environment variables if not found in DB
 * - Cached in memory with a TTL
 */
export interface StateGenerationConfig {
    // Context retrieval: how many previous days to include
    // - 1: only yesterday (fastest, least context)
    // - N: last N days (balanced)
    // - -1: all available history (slowest, most context)
    contextWindowDays: number;

    // If true, intelligently filter states (skip stable days, include only changes)
    // If false, include all states in the window
    smartFiltering: boolean;

    // Max size of tokens to send to LLM (for context)
    maxContextTokens: number;

    // Include a summary trajectory instead of full state history
    includeTrajectory: boolean;
}

const DEFAULT_CONFIG: StateGenerationConfig = {
    contextWindowDays: 1, // Default: only yesterday
    smartFiltering: false, // Default: include all states
    maxContextTokens: 8000, // Default limit
    includeTrajectory: false, // Default: no summary
};

// In-memory cache with TTL
let configCache: StateGenerationConfig | null = null;
let configCacheExpiry: number = 0;
const CONFIG_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get current configuration.
 * - Checks in-memory cache first (1 min TTL)
 * - Falls back to DB
 * - Falls back to environment variables
 * - Falls back to hardcoded defaults
 */
export async function getStateGenerationConfig(): Promise<StateGenerationConfig> {
    const now = Date.now();

    // Check cache validity
    if (configCache && now < configCacheExpiry) {
        return configCache;
    }

    // Try to load from DB
    try {
        const dbConfig = await prisma.graphConfig.findFirst({
            where: { graphName: "state-generation" },
        });

        if (dbConfig) {
            const config: StateGenerationConfig = {
                contextWindowDays:
                    parseInt(
                        process.env.CONTEXT_WINDOW_DAYS ??
                            String(dbConfig.contextWindowDays),
                    ) || DEFAULT_CONFIG.contextWindowDays,
                smartFiltering:
                    process.env.SMART_FILTERING === "true" ||
                    dbConfig.smartFiltering,
                maxContextTokens:
                    parseInt(
                        process.env.MAX_CONTEXT_TOKENS ??
                            String(dbConfig.maxContextTokens),
                    ) || DEFAULT_CONFIG.maxContextTokens,
                includeTrajectory:
                    process.env.INCLUDE_TRAJECTORY === "true" ||
                    dbConfig.includeTrajectory,
            };

            configCache = config;
            configCacheExpiry = now + CONFIG_CACHE_TTL;
            return config;
        }
    } catch (e) {
        console.warn(
            "Failed to load config from DB, falling back to env vars:",
            e,
        );
    }

    // Fallback: load from environment variables
    const config: StateGenerationConfig = {
        contextWindowDays: parseInt(process.env.CONTEXT_WINDOW_DAYS ?? "1"),
        smartFiltering: process.env.SMART_FILTERING === "true",
        maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS ?? "8000"),
        includeTrajectory: process.env.INCLUDE_TRAJECTORY === "true",
    };

    configCache = config;
    configCacheExpiry = now + CONFIG_CACHE_TTL;
    return config;
}

/**
 * Update configuration at runtime (no redeployment needed).
 *
 * Usage: Admin calls this via API to change behavior in production.
 * Changes take effect immediately (cache invalidated).
 */
export async function updateStateGenerationConfig(
    updates: Partial<StateGenerationConfig>,
): Promise<StateGenerationConfig> {
    // Upsert into DB
    await prisma.graphConfig.upsert({
        where: { graphName: "state-generation" },
        create: {
            graphName: "state-generation",
            contextWindowDays:
                updates.contextWindowDays ?? DEFAULT_CONFIG.contextWindowDays,
            smartFiltering:
                updates.smartFiltering ?? DEFAULT_CONFIG.smartFiltering,
            maxContextTokens:
                updates.maxContextTokens ?? DEFAULT_CONFIG.maxContextTokens,
            includeTrajectory:
                updates.includeTrajectory ?? DEFAULT_CONFIG.includeTrajectory,
        },
        update: {
            contextWindowDays: updates.contextWindowDays,
            smartFiltering: updates.smartFiltering,
            maxContextTokens: updates.maxContextTokens,
            includeTrajectory: updates.includeTrajectory,
        },
    });

    // Invalidate cache
    configCache = null;
    configCacheExpiry = 0;

    // Return updated config
    return await getStateGenerationConfig();
}

/**
 * Reset configuration to defaults (useful for testing or rollback).
 */
export async function resetStateGenerationConfig(): Promise<StateGenerationConfig> {
    // delete-by-id (graphName is @id); deleteMany is transaction-wrapped → unsupported on HTTP.
    const existing = await prisma.graphConfig.findUnique({
        where: { graphName: "state-generation" },
        select: { graphName: true },
    });
    if (existing)
        await prisma.graphConfig.delete({
            where: { graphName: existing.graphName },
        });

    configCache = null;
    configCacheExpiry = 0;

    return DEFAULT_CONFIG;
}
