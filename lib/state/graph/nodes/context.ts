import { prisma } from "@/lib/prisma";
import { getStateHistory } from "@/lib/state/service";
import { StateGenerationLangGraphState } from "@/lib/state/graph/annotation";
import { getPatientMemory, buildRawWindow } from "@/lib/memory/service";
import { buildHeuristicDigest } from "@/lib/state/services/digest";
import { buildRollingTrends } from "@/lib/memory/rolling";
import { getDailyMetrics } from "@/lib/metrics/service";
import { getRecoveryDay, getRecoveryPhase } from "@/lib/engagement";
import { createLogger } from "@/lib/logger";

const log = createLogger("state-gen");

/**
 * Node: load_context
 *
 * Assembles the COMPACTED context for the day's plan generation. Three layers, all built here
 * and shared (byte-identical) across every parallel module call so they cache as one prefix:
 *
 *   1. patientMemory  — two-tier consolidated memory (stable facts + per-phase narrative).
 *   2. heuristicDigest — deterministic signals over the full state history (today vs baseline),
 *                        plus ROLLING TRENDS: week-over-week + 30-day aggregates from the
 *                        persisted DailyMetric rows (the mid-tier timespan view, TODO 9.2).
 *   3. rawWindow      — unconsolidated prose since the memory watermark (recency ground-truth).
 *
 * Plus `previousState` (the most recent prior state) for structural carry-forward.
 *
 * NOTE (TODO 9.1/9.2): the previous version also built a full `transcripts` string and loaded an
 * N-day `stateHistory`/`smartFiltering` set — both were computed but never consumed downstream,
 * so they were removed. `previousState` is now the most-recent prior state (robust to logging
 * gaps) rather than strictly yesterday's exact date. See docs/MEMORY_AUDIT.md.
 */
export async function loadContextNode(
    state: StateGenerationLangGraphState,
): Promise<Partial<StateGenerationLangGraphState>> {
    const genDate = new Date(state.date);
    log.info(
        `▶ load_context | user=${state.userId} | date=${genDate
            .toISOString()
            .slice(0, 10)}`,
    );

    // User + threads + biometrics in one fetch (surgery date drives recovery day/phase).
    const user = await prisma.user.findUnique({
        where: { id: state.userId },
        include: { threads: { include: { messages: true } }, biometric: true },
    });
    if (!user) throw new Error(`User ${state.userId} not found`);

    const surgeryDate = user.biometric?.surgeryDate ?? null;
    const recoveryDay = getRecoveryDay({ surgeryDate, today: genDate });
    const recoveryPhase = getRecoveryPhase(recoveryDay);

    // Full active-state chain (read-only, ascending). Feeds the digest's trends and gives us the
    // most recent prior state — independent of any per-day window config.
    const fullHistory = await getStateHistory(state.userId);
    const previousState =
        [...fullHistory]
            .filter((s) => new Date(s.dateCreated) < genDate)
            .pop() ?? null;

    // Deterministic signals (today vs baseline) + rolling multi-window trends from DailyMetric.
    const digestBase = buildHeuristicDigest({
        history: fullHistory,
        surgeryDate,
        now: genDate,
    });
    const metrics = await getDailyMetrics(state.userId);
    const rollingTrends = buildRollingTrends(metrics, genDate);
    const heuristicDigest = rollingTrends
        ? `${digestBase}\n\n${rollingTrends}`
        : digestBase;

    // Compaction: consolidated memory + the unconsolidated raw window since the watermark.
    const patientMemory = await getPatientMemory(state.userId);
    const rawWindow = buildRawWindow(
        user.threads,
        patientMemory?.consolidatedThrough ?? new Date(0),
    );

    const contextMetadata = {
        statesInHistory: fullHistory.length,
        metricRows: metrics.length,
        digestChars: heuristicDigest.length,
        rollingTrendChars: rollingTrends.length,
        rawWindowChars: rawWindow.text.length,
        memoryChars:
            (patientMemory?.semantic.length ?? 0) +
            (patientMemory?.episodic.reduce(
                (n, s) => n + s.narrative.length,
                0,
            ) ?? 0),
    };

    log.info(
        `✓ load_context | memory=${patientMemory ? "present" : "none"} | ` +
            `history=${fullHistory.length}d, metrics=${metrics.length}d, rolling=${rollingTrends.length}c | ` +
            `rawWindow=${rawWindow.messageCount} msg/${rawWindow.text.length} chars` +
            `${rawWindow.hasDoctorNote ? " (doctor note)" : ""} | ` +
            `recoveryDay=${recoveryDay ?? "?"} (${recoveryPhase}) | prevState=${
                previousState ? "yes" : "none"
            }`,
    );

    return {
        previousState,
        contextMetadata,
        patientMemory,
        heuristicDigest,
        rawWindow,
        recoveryDay,
        recoveryPhase,
    };
}
