import { getStagnationSignal, type DayPain } from "./arc";

/**
 * Clinician-facing flag rules over a patient's recovery-progress series (0–100% of the
 * plan completed), plus the existing pain-stagnation rule. Pure and unit-testable, mirroring
 * arc.ts. Each rule answers one question a reviewing specialist would ask:
 *   - nearing 100%  → time for a final review
 *   - stalled 7 days → time to find out what's blocking recovery
 *   - dropping 2 days → time to check for a setback or complication
 */

export type DayProgress = { day: number; progress: number };
export type FlagSeverity = "info" | "attention" | "critical";
export type FlagKind = "nearing_completion" | "progress_stalled" | "progress_dropping" | "pain_stagnation";
export type RecoveryFlag = {
  kind: FlagKind;
  severity: FlagSeverity;
  title: string;
  detail: string;
  action: string;
};

const NEAR_COMPLETE_PCT = 90; // at/above this (but < 100) → ready for the final specialist review
const STALL_WINDOW = 7; // days
const MIN_WEEKLY_GAIN = 3; // percentage points; less than this over the window = stalled
const DROP_DAYS = 2; // consecutive day-over-day declines

const SEVERITY_RANK: Record<FlagSeverity, number> = { critical: 3, attention: 2, info: 1 };

/** Latest progress sits in the near-complete band [threshold, 100). */
export function getCompletionSignal(series: DayProgress[], threshold = NEAR_COMPLETE_PCT): { near: boolean; latest: number | null } {
  if (!series.length) return { near: false, latest: null };
  const latest = series[series.length - 1].progress;
  return { near: latest >= threshold && latest < 100, latest };
}

/** Progress gained less than `MIN_WEEKLY_GAIN` points over the trailing `window` days, while not yet complete. */
export function getProgressStagnation(series: DayProgress[], window = STALL_WINDOW): { stalled: boolean; window: number; from: number | null; to: number | null } {
  if (series.length < window) return { stalled: false, window, from: null, to: null };
  const recent = series.slice(-window);
  const from = recent[0].progress;
  const to = recent[recent.length - 1].progress;
  return { stalled: to < 100 && to - from < MIN_WEEKLY_GAIN, window, from, to };
}

/** Progress declined day-over-day on each of the last `days` days. */
export function getProgressRegression(series: DayProgress[], days = DROP_DAYS): { dropping: boolean; days: number; from: number | null; to: number | null } {
  if (series.length < days + 1) return { dropping: false, days, from: null, to: null };
  let drops = 0;
  for (let i = series.length - 1; i >= series.length - days; i--) {
    if (series[i].progress < series[i - 1].progress) drops++;
  }
  const from = series[series.length - 1 - days].progress;
  const to = series[series.length - 1].progress;
  return { dropping: drops >= days, days, from, to };
}

/**
 * Evaluate every flag rule and return matching flags, most severe first. A 2-day drop
 * supersedes the gentler "stalled"/"nearing completion" framings (a falling patient is
 * not "nearly done").
 */
export function evaluateRecoveryFlags(input: { progress?: DayProgress[]; pain?: DayPain[] }): RecoveryFlag[] {
  const progress = input.progress ?? [];
  const flags: RecoveryFlag[] = [];

  const drop = getProgressRegression(progress);
  const stall = getProgressStagnation(progress);
  const done = getCompletionSignal(progress);

  if (drop.dropping) {
    flags.push({
      kind: "progress_dropping",
      severity: "critical",
      title: "Progress dropping",
      detail: `Recovery progress fell from ${drop.from}% to ${drop.to}% over ${drop.days} days running.`,
      action: "Review for a setback or complication",
    });
  }
  if (stall.stalled && !drop.dropping) {
    flags.push({
      kind: "progress_stalled",
      severity: "attention",
      title: "Progress stalled",
      detail: `Held near ${stall.to}% — under ${MIN_WEEKLY_GAIN}% gained over the last ${stall.window} days.`,
      action: "Check in on what's blocking recovery",
    });
  }
  if (done.near && !drop.dropping) {
    flags.push({
      kind: "nearing_completion",
      severity: "info",
      title: "Nearing completion",
      detail: `Recovery is ${done.latest}% complete — ready for a final review with the specialist.`,
      action: "Schedule the final specialist review",
    });
  }

  if (input.pain) {
    const pain = getStagnationSignal(input.pain, 3);
    if (pain.stalled) {
      flags.push({
        kind: "pain_stagnation",
        severity: "critical",
        title: "Pain not decreasing",
        detail: `Pain held at ${pain.to}/10 over the last ${pain.window} days, above the expected curve.`,
        action: "Escalate to the surgeon",
      });
    }
  }

  return flags.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

/** Highest severity among a patient's flags (for sorting lists), or 0 when clear. */
export function maxSeverity(flags: RecoveryFlag[]): number {
  return flags.reduce((max, f) => Math.max(max, SEVERITY_RANK[f.severity]), 0);
}
