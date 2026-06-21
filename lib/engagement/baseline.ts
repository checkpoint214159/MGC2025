export type BaselineDelta = {
  metric: string;
  now: number;
  baseline: number;
  delta: number;
  better: boolean;
};

/**
 * Compares a metric's current value against the patient's OWN earliest recorded
 * value (their day-1 baseline) — never a population average. `higherIsBetter`
 * is false for metrics like pain where a lower value is improvement.
 */
export function getBaselineDelta(
  metric: string,
  now: number,
  baseline: number,
  higherIsBetter = true,
): BaselineDelta {
  const delta = now - baseline;
  const better = higherIsBetter ? delta >= 0 : delta <= 0;
  return { metric, now, baseline, delta, better };
}
