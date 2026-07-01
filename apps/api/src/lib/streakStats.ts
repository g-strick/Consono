/**
 * streakStats.ts — Pure streak-detail aggregation functions.
 *
 * No DB imports, no Hono — pure functions so they are unit-testable with vitest.
 * Consumer: apps/api/src/routes/streak.ts
 *
 * Day boundary: device-local midnight (D-02). Uses dayKeyLocal imported from
 * homeSummary.ts — do NOT duplicate date helpers here.
 */

import { dayKeyLocal } from './homeSummary.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single review row from the reviews table.
 * state_before / rating match the DB enum values (D-09).
 */
export type ReviewRow = {
  reviewed_at: Date;
  rating: 'again' | 'hard' | 'good' | 'easy';
  state_before: 'new' | 'learning' | 'review' | 'relearning';
};

// ─── Window boundary helper ────────────────────────────────────────────────────

/**
 * Returns true when a Date falls within [windowStart, windowEnd] inclusive,
 * compared at the local-day granularity (same day counts as in-range).
 */
function inWindow(date: Date, windowStart: Date, windowEnd: Date): boolean {
  const key = dayKeyLocal(date);
  const startKey = dayKeyLocal(windowStart);
  const endKey = dayKeyLocal(windowEnd);
  return key >= startKey && key <= endKey;
}

// ─── computeRetention (D-09) ─────────────────────────────────────────────────

/**
 * Compute True FSRS retention (Anki "True Retention") for the given window.
 *
 * Denominator: reviews where state_before === 'review' within [windowStart, windowEnd].
 * Numerator:   those with rating !== 'again' (recalled).
 * 0 due reviews in window → returns 0 (never divide by zero).
 * Route formats as a percentage; this returns a fraction (0.0 – 1.0).
 */
export function computeRetention(reviews: ReviewRow[], windowStart: Date, windowEnd: Date): number {
  const dueReps = reviews.filter(
    (r) => r.state_before === 'review' && inWindow(r.reviewed_at, windowStart, windowEnd),
  );
  if (dueReps.length === 0) return 0;
  const recalled = dueReps.filter((r) => r.rating !== 'again').length;
  return recalled / dueReps.length;
}

// ─── computeDaysActive (D-07) ─────────────────────────────────────────────────

/**
 * Count distinct local-day-keys with ≥1 review inside [windowStart, windowEnd].
 */
export function computeDaysActive(
  reviewedAtDates: Date[],
  windowStart: Date,
  windowEnd: Date,
): number {
  const activeDays = new Set<string>();
  for (const date of reviewedAtDates) {
    if (inWindow(date, windowStart, windowEnd)) {
      activeDays.add(dayKeyLocal(date));
    }
  }
  return activeDays.size;
}

// ─── computeReviewsInWindow (D-07) ───────────────────────────────────────────

/**
 * Count reviews whose reviewed_at falls inside [windowStart, windowEnd].
 * Multiple reviews on the same day each count.
 */
export function computeReviewsInWindow(
  reviewedAtDates: Date[],
  windowStart: Date,
  windowEnd: Date,
): number {
  return reviewedAtDates.filter((date) => inWindow(date, windowStart, windowEnd)).length;
}

// ─── computePerDayCount (D-07) ────────────────────────────────────────────────

/**
 * Map each local-day-key to its total review count across all dates.
 * Used to build heatmap intensity data.
 */
export function computePerDayCount(reviewedAtDates: Date[]): Map<string, number> {
  const perDay = new Map<string, number>();
  for (const date of reviewedAtDates) {
    const key = dayKeyLocal(date);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  return perDay;
}

// ─── computeHeatLevels (Claude's Discretion: quartile-based) ─────────────────

/**
 * Map each day-key to a heat intensity 0–3 using quartile-based bucketing.
 *
 * - Level 0: 0 reviews (no activity).
 * - Levels 1–3: non-zero counts split into quartile buckets over the sorted
 *   distribution of non-zero counts. Q1 → 1, Q2 → 2, Q3/Q4 → 3.
 * - When only one distinct non-zero value exists → level 3.
 *
 * This matches the GitHub-style 4-stop activity ramp (D-Claude's Discretion).
 */
export function computeHeatLevels(perDay: Map<string, number>): Map<string, 0 | 1 | 2 | 3> {
  const result = new Map<string, 0 | 1 | 2 | 3>();
  if (perDay.size === 0) return result;

  // Collect non-zero counts for quartile computation
  const nonZeroCounts: number[] = [];
  for (const count of perDay.values()) {
    if (count > 0) nonZeroCounts.push(count);
  }

  if (nonZeroCounts.length === 0) {
    for (const key of perDay.keys()) result.set(key, 0);
    return result;
  }

  nonZeroCounts.sort((a, b) => a - b);
  const n = nonZeroCounts.length;

  // Single distinct non-zero value → everyone gets level 3 (no ranking to do)
  const distinctValues = new Set(nonZeroCounts);
  if (distinctValues.size === 1) {
    for (const [key, count] of perDay.entries()) {
      result.set(key, count === 0 ? 0 : 3);
    }
    return result;
  }

  // Quartile boundaries (index-based, inclusive lower bound)
  // nonZeroCounts is non-empty and has at least 2 distinct values at this point,
  // so these indices are always valid; the ?? fallback satisfies noUncheckedIndexedAccess.
  const q1 = nonZeroCounts[Math.floor(n * 0.25)] ?? nonZeroCounts[0] ?? 0;
  const q2 = nonZeroCounts[Math.floor(n * 0.5)] ?? nonZeroCounts[0] ?? 0;

  for (const [key, count] of perDay.entries()) {
    if (count === 0) {
      result.set(key, 0);
    } else if (count <= q1) {
      result.set(key, 1);
    } else if (count <= q2) {
      result.set(key, 2);
    } else {
      result.set(key, 3);
    }
  }

  return result;
}

// ─── computeBestRuns (D-04/05/06) ────────────────────────────────────────────

/**
 * A single consecutive-active-day run entry.
 */
export type RunEntry = {
  days: number;
  start: Date;
  end: Date;
  current: boolean;
};

/**
 * Find all maximal consecutive-active-day runs and return top-5, ranked
 * longest-first (D-04), with ties broken by most-recent end date (D-05).
 * The ongoing/current run is always present in the result even if it would
 * be truncated from top-5 (D-05). Runs of any length including 1-day qualify (D-06).
 *
 * Current = run whose end day-key is today or yesterday (matching computeStreak
 * grace semantics in homeSummary.ts).
 *
 * Not period-scoped — operates on all-time review dates.
 *
 * No reviews → returns [] (route renders the empty-state single row per UI-SPEC).
 */
export function computeBestRuns(reviewedAtDates: Date[], now: Date): RunEntry[] {
  if (reviewedAtDates.length === 0) return [];

  // Collect distinct active day keys and sort ascending
  const activeDayKeys = Array.from(new Set(reviewedAtDates.map(dayKeyLocal))).sort();

  if (activeDayKeys.length === 0) return [];

  // Build a map from day-key → noon Date for start/end reporting
  const keyToDate = new Map<string, Date>();
  for (const date of reviewedAtDates) {
    const key = dayKeyLocal(date);
    if (!keyToDate.has(key)) {
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      keyToDate.set(key, d);
    }
  }

  // Walk the sorted active days and group consecutive calendar days into runs.
  // Two day-keys are consecutive if their underlying dates differ by exactly 1 day.
  // Use Date arithmetic (not string compare) to handle cross-month boundaries (D-Task2).
  const runs: Omit<RunEntry, 'current'>[] = [];
  // activeDayKeys is non-empty (checked above); assert with ! to satisfy noUncheckedIndexedAccess
  let runStart = activeDayKeys[0]!;
  let runEnd = activeDayKeys[0]!;

  for (let i = 1; i < activeDayKeys.length; i++) {
    const prevKey = activeDayKeys[i - 1]!;
    const currKey = activeDayKeys[i]!;

    // Parse day-keys back to local-midnight Dates for safe arithmetic
    const prevDate = parseLocalMidnight(prevKey);
    const currDate = parseLocalMidnight(currKey);

    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      // Consecutive — extend current run
      runEnd = currKey;
    } else {
      // Gap — emit current run and start a new one
      runs.push({
        days: daysBetweenKeys(runStart, runEnd),
        start: keyToDate.get(runStart)!,
        end: keyToDate.get(runEnd)!,
      });
      runStart = currKey;
      runEnd = currKey;
    }
  }
  // Emit the final run
  runs.push({
    days: daysBetweenKeys(runStart, runEnd),
    start: keyToDate.get(runStart)!,
    end: keyToDate.get(runEnd)!,
  });

  // Determine which run (if any) is the current/ongoing run.
  // Current = end day-key is today or yesterday (matches computeStreak grace).
  const todayKey = dayKeyLocal(now);
  const yesterdayCursor = new Date(now);
  yesterdayCursor.setDate(yesterdayCursor.getDate() - 1);
  const yesterdayKey = dayKeyLocal(yesterdayCursor);

  const currentRunIndex = runs.findIndex((r) => {
    const endKey = dayKeyLocal(r.end);
    return endKey === todayKey || endKey === yesterdayKey;
  });

  // Sort all runs: longest-first, ties by most-recent end date (D-05)
  const sortedRuns = [...runs].sort((a, b) => {
    if (b.days !== a.days) return b.days - a.days;
    return b.end.getTime() - a.end.getTime();
  });

  // Take top 5
  const top5 = sortedRuns.slice(0, 5);

  // Tag current flag
  const tagCurrent = (run: Omit<RunEntry, 'current'>, isCurrent: boolean): RunEntry => ({
    ...run,
    current: isCurrent,
  });

  // Find if the current run (if it exists) is already in top5
  const currentRun = currentRunIndex !== -1 ? runs[currentRunIndex] : null;

  if (!currentRun) {
    // No current run — just return top5 tagged non-current
    return top5.map((r) => tagCurrent(r, false));
  }

  // Check if the current run appears in top5
  const currentInTop5 = top5.some(
    (r) => r.start.getTime() === currentRun.start.getTime() && r.days === currentRun.days,
  );

  if (currentInTop5) {
    // Tag it current in the top5 list
    return top5.map((r) => {
      const isCurrentRun =
        r.start.getTime() === currentRun.start.getTime() && r.days === currentRun.days;
      return tagCurrent(r, isCurrentRun);
    });
  } else {
    // Current run not in top5 — append it (result can be 6 entries per D-05)
    return [...top5.map((r) => tagCurrent(r, false)), tagCurrent(currentRun, true)];
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Parse a 'YYYY-MM-DD' day-key to local midnight Date for safe arithmetic. */
function parseLocalMidnight(key: string): Date {
  const parts = key.split('-').map(Number);
  // Day-keys are always 'YYYY-MM-DD'; all three parts are guaranteed present
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Inclusive day count between two day-keys (runStart → runEnd). */
function daysBetweenKeys(startKey: string, endKey: string): number {
  const start = parseLocalMidnight(startKey);
  const end = parseLocalMidnight(endKey);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}
