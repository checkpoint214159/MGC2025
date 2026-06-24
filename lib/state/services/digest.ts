import type { State } from "@/lib/state/schemas/state";
import {
    getRecoveryDay,
    getRecoveryPhase,
    getPhaseLabel,
    getStreak,
    getPainSeries,
    getBaselineDelta,
    getTopPriorities,
    evaluateRecoveryFlags,
    type DayRecord,
} from "@/lib/engagement";

/**
 * buildHeuristicDigest — the deterministic, numbers-from-code half of the plan-gen context.
 *
 * The model is bad at, and inconsistent across providers at, arithmetic over long JSON
 * arrays (slopes, counts, rates, baselines). So we never send it the raw numeric series —
 * we compute the signals here and hand it a tiny, labelled digest it can simply read.
 * Pure and dependency-free (no DB, no React), unit-testable like the rest of lib/engagement.
 *
 * Built once per generation in load_context and shared verbatim across every module's Send
 * (so it also caches as part of the prompt prefix). Single-stream signals only; cross-stream
 * lagged correlations (sleep→pain, exertion→pain) are deferred until there's enough real data
 * to validate them.
 */

export type HeuristicDigestInput = {
    history: State[]; // full active-state chain, oldest → newest (from getStateHistory)
    surgeryDate: Date | null;
    now?: Date;
};

const NL = "\n";

/** A day counts toward adherence/streak only if it had priorities and all were completed. */
function dayRecords(history: State[]): DayRecord[] {
    return history.map((s) => {
        const ps = getTopPriorities(s, 10);
        return {
            date: new Date(s.dateCreated).toISOString().slice(0, 10),
            allComplete: ps.length > 0 && ps.every((p) => p.isComplete),
        };
    });
}

/** Fraction of today's priorities completed (0–1), or null if there were none to complete. */
function dayAdherence(state: State): number | null {
    const ps = getTopPriorities(state, 10);
    if (ps.length === 0) return null;
    return ps.filter((p) => p.isComplete).length / ps.length;
}

/** Mean per-day adherence over the trailing `window` days that had any priorities. */
function windowAdherencePct(history: State[], window: number): number | null {
    const recent = history
        .slice(-window)
        .map(dayAdherence)
        .filter((v): v is number => v !== null);
    if (recent.length === 0) return null;
    return Math.round(
        (recent.reduce((a, b) => a + b, 0) / recent.length) * 100,
    );
}

export function buildHeuristicDigest(input: HeuristicDigestInput): string {
    const now = input.now ?? new Date();
    const history = input.history ?? [];
    const lines: string[] = [];

    const recoveryDay = getRecoveryDay({
        surgeryDate: input.surgeryDate,
        today: now,
    });
    const phaseLabel = getPhaseLabel(getRecoveryPhase(recoveryDay));
    lines.push(
        recoveryDay !== null
            ? `- Recovery day: ${recoveryDay} (phase: ${phaseLabel})`
            : `- Recovery day: unknown (no surgery date on file)`,
    );

    // Logging cadence + adherence streak (forgives one missed day; two resets).
    const records = dayRecords(history);
    const completeDays = records.filter((r) => r.allComplete).length;
    lines.push(
        `- Days with a full plan completed: ${completeDays} of ${records.length} logged`,
    );
    const streak = getStreak(records);
    lines.push(
        `- Adherence streak: ${streak.count} day(s)${
            streak.atCap ? " (at cap)" : ""
        }${streak.reset ? " — just reset after 2 missed days" : ""}`,
    );

    const adh7 = windowAdherencePct(history, 7);
    const adh14 = windowAdherencePct(history, 14);
    if (adh7 !== null) {
        lines.push(
            `- Plan adherence: ${adh7}% over last 7d${
                adh14 !== null ? `, ${adh14}% over last 14d` : ""
            }`,
        );
    }

    // Pain trajectory vs the patient's OWN baseline + the expected recovery curve.
    if (input.surgeryDate) {
        const series = getPainSeries(history, input.surgeryDate);
        if (series.length >= 1) {
            const baselinePain = series[0].pain;
            const currentPain = series[series.length - 1].pain;
            const delta = getBaselineDelta(
                "pain",
                currentPain,
                baselinePain,
                /* higherIsBetter */ false,
            );
            lines.push(
                `- Pain: now ${currentPain}/10, baseline ${baselinePain}/10, Δ ${
                    delta.delta >= 0 ? "+" : ""
                }${delta.delta} (${
                    delta.better
                        ? "improving vs baseline"
                        : "worse than baseline"
                })`,
            );

            // The named pain-stagnation rule (≥3 days flat above the floor). Reuse the flag's
            // own copy so the digest text matches the clinician-facing flag exactly.
            const flags = evaluateRecoveryFlags({ pain: series });
            const painFlag = flags.find((f) => f.kind === "pain_stagnation");
            if (painFlag)
                lines.push(`- ⚠ ${painFlag.title}: ${painFlag.detail}`);
        } else {
            lines.push(`- Pain: no pain logged yet`);
        }
    }

    if (lines.length === 0)
        return "RECOVERY SIGNALS: none available yet (no history).";

    return (
        "RECOVERY SIGNALS (computed deterministically from the patient's logged history — " +
        "treat as ground truth; do NOT recompute or contradict these numbers):" +
        NL +
        lines.join(NL)
    );
}
