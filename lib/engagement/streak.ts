export type DayRecord = { date: string; allComplete: boolean };
export type Streak = { count: number; atCap: boolean; reset: boolean };

const CAP = 7;

/**
 * Consecutive complete-day streak, capped at 7. A single missed day is forgiven
 * (the count holds but does not grow); two consecutive misses reset to 0.
 * `history` is oldest → newest.
 */
export function getStreak(history: DayRecord[]): Streak {
  let count = 0;
  let misses = 0;
  for (const day of history) {
    if (day.allComplete) {
      count = Math.min(count + 1, CAP);
      misses = 0;
    } else {
      misses += 1;
      if (misses >= 2) count = 0;
    }
  }
  return { count, atCap: count === CAP, reset: misses >= 2 };
}
