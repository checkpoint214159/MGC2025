"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StateGenerationConfig } from "@/lib/state/graph/config";

/**
 * Admin UI to configure state generation graph behavior.
 *
 * Features:
 * - Display current configuration
 * - Adjust context window (1, N, or all previous days)
 * - Toggle smart filtering
 * - Adjust token limits
 * - Reset to defaults
 * - Real-time updates (cache invalidation)
 */
export default function GraphConfigPanel() {
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState(false);

    // Fetch current config
    const { data: config, isLoading } = useQuery({
        queryKey: ["graph-config"],
        queryFn: async () => {
            const res = await fetch("/api/admin/graph-config");
            if (!res.ok) throw new Error("Failed to fetch config");
            return (await res.json()) as StateGenerationConfig;
        },
    });

    // Update config mutation
    const updateMutation = useMutation({
        mutationFn: async (updates: Partial<StateGenerationConfig>) => {
            const res = await fetch("/api/admin/graph-config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error("Failed to update config");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graph-config"] });
        },
    });

    // Reset config mutation
    const resetMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/admin/graph-config", {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to reset config");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graph-config"] });
        },
    });

    if (isLoading)
        return <div className="text-ink-subtle">Loading config...</div>;
    if (!config)
        return <div className="text-critical-ink">Failed to load config</div>;

    return (
        <div className="rounded-lg border border-border bg-surface-sunken/40 p-4">
            <button
                onClick={() => setExpanded(!expanded)}
                className="font-bold text-sm cursor-pointer flex items-center gap-2"
            >
                <span>{expanded ? "▼" : "▶"}</span>
                <span>State Generation Graph Configuration</span>
            </button>

            {expanded && (
                <div className="mt-4 space-y-4">
                    {/* Context Window */}
                    <div>
                        <label className="block text-sm font-semibold text-ink mb-2">
                            Context Window: Load Previous States
                        </label>
                        <div className="space-y-2">
                            <p className="text-xs text-ink-muted">
                                Current:{" "}
                                <strong>
                                    {formatContextWindowDays(
                                        config.contextWindowDays,
                                    )}
                                </strong>
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { label: "Yesterday only", value: 1 },
                                    { label: "Last 3 days", value: 3 },
                                    { label: "Last 7 days", value: 7 },
                                    { label: "All history", value: -1 },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() =>
                                            updateMutation.mutate({
                                                contextWindowDays: option.value,
                                            })
                                        }
                                        disabled={updateMutation.isPending}
                                        className={`px-3 py-1 rounded text-sm font-medium transition ${
                                            config.contextWindowDays ===
                                            option.value
                                                ? "bg-accent text-ink-inverse"
                                                : "bg-surface border border-border-strong text-ink-muted hover:bg-surface-sunken"
                                        } disabled:opacity-50`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-ink-muted">
                                ⓘ Sets how much historical state (from previous
                                days) to include in context: 1 = fastest
                                (Yesterday only) | N = balanced | -1 = slowest
                                (All)
                            </p>
                        </div>
                    </div>

                    {/* Smart Filtering */}
                    <div>
                        <label className="block text-sm font-semibold text-ink mb-2">
                            Smart Filtering
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    updateMutation.mutate({
                                        smartFiltering: !config.smartFiltering,
                                    })
                                }
                                disabled={updateMutation.isPending}
                                className={`px-4 py-1 rounded font-medium transition ${
                                    config.smartFiltering
                                        ? "bg-progress text-ink-inverse"
                                        : "bg-surface border border-border-strong text-ink-muted hover:bg-surface-sunken"
                                } disabled:opacity-50`}
                            >
                                {config.smartFiltering ? "Enabled" : "Disabled"}
                            </button>
                            <span className="text-xs text-ink-muted">
                                ⓘ When enabled, skips states with no significant
                                changes (reduces context overload)
                            </span>
                        </div>
                    </div>

                    {/* Max Context Tokens */}
                    <div>
                        <label className="block text-sm font-semibold text-ink mb-2">
                            Max Context Tokens
                        </label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                value={config.maxContextTokens}
                                onChange={(e) =>
                                    updateMutation.mutate({
                                        maxContextTokens:
                                            parseInt(e.target.value) || 8000,
                                    })
                                }
                                disabled={updateMutation.isPending}
                                className="px-2 py-1 border border-border-strong bg-surface rounded-md w-32 text-sm text-ink"
                            />
                            <span className="text-xs text-ink-muted">
                                ⓘ Soft limit on LLM context size. Higher = more
                                history sent to LLM (may increase latency)
                            </span>
                        </div>
                    </div>

                    {/* Include Trajectory */}
                    <div>
                        <label className="block text-sm font-semibold text-ink mb-2">
                            Include Trajectory Summary
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    updateMutation.mutate({
                                        includeTrajectory:
                                            !config.includeTrajectory,
                                    })
                                }
                                disabled={updateMutation.isPending}
                                className={`px-4 py-1 rounded font-medium transition ${
                                    config.includeTrajectory
                                        ? "bg-progress text-ink-inverse"
                                        : "bg-surface border border-border-strong text-ink-muted hover:bg-surface-sunken"
                                } disabled:opacity-50`}
                            >
                                {config.includeTrajectory
                                    ? "Enabled"
                                    : "Disabled"}
                            </button>
                            <span className="text-xs text-ink-muted">
                                ⓘ When enabled, includes a text summary of
                                recovery trajectory instead of full states
                            </span>
                        </div>
                    </div>

                    {/* Reset Button */}
                    <div className="pt-4 border-t">
                        <button
                            onClick={() => resetMutation.mutate()}
                            disabled={resetMutation.isPending}
                            className="px-4 py-2 bg-critical-soft text-critical-ink border border-critical/30 rounded-md font-medium hover:opacity-80 transition disabled:opacity-50 text-sm"
                        >
                            {resetMutation.isPending
                                ? "Resetting..."
                                : "Reset to Defaults"}
                        </button>
                        <p className="text-xs text-ink-muted mt-2">
                            ⓘ Rolls back all changes to built-in defaults
                        </p>
                    </div>

                    {/* Status */}
                    {updateMutation.isPending && (
                        <p className="text-sm text-accent-ink">Updating...</p>
                    )}
                    {updateMutation.isSuccess && (
                        <p className="text-sm text-progress-ink">
                            Configuration updated successfully
                        </p>
                    )}
                    {updateMutation.isError && (
                        <p className="text-sm text-critical-ink">
                            Error: {updateMutation.error?.message}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function formatContextWindowDays(days: number): string {
    if (days === -1) return "All available history";
    if (days === 1) return "Yesterday only";
    return `Last ${days} days`;
}
