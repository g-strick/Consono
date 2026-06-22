/**
 * homeSummary.ts — Pure streak + today-stats date math.
 *
 * No DB imports, no Hono — pure functions so they are unit-testable with vitest.
 * Consumer: apps/api/src/routes/home.ts
 *
 * Day boundary: device-local midnight (D-02). All day-key comparisons use
 * local-time Date getters (getFullYear/getMonth/getDate), never UTC/ISO slicing.
 */

/**
 * Returns a stable local-day key string ('YYYY-MM-DD') for the given date.
 * Two timestamps on the same local calendar day produce the same key.
 */
export function dayKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns a new Date set to 00:00:00.000 local time for the calendar day of `now`.
 */
export function localDayStart(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Compute the current streak length from a list of reviewed_at timestamps.
 *
 * Rules (D-01, D-02):
 * - A day is "active" if ≥1 review occurred on that local calendar day.
 * - Streak = consecutive active days ending at the most recent active day,
 *   provided that day is TODAY or YESTERDAY (alive-but-not-yet-incremented).
 * - If the most recent active day is 2+ days ago → streak is broken → return 0.
 * - Empty input → 0.
 */
export function computeStreak(reviewedAtDates: Date[], now: Date): number {
  if (reviewedAtDates.length === 0) return 0;

  // Build a deduplicated set of active day keys
  const activeDays = new Set<string>(reviewedAtDates.map(dayKeyLocal));

  const todayKey = dayKeyLocal(now);

  // Walk backwards from today to find the most recent active day
  // If today has no reviews, check yesterday (streak is alive at-risk)
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0); // noon for safe date arithmetic

  // The most recent active day must be today or yesterday for the streak to be alive
  const todayActive = activeDays.has(todayKey);
  const yesterdayCursor = new Date(cursor);
  yesterdayCursor.setDate(cursor.getDate() - 1);
  const yesterdayKey = dayKeyLocal(yesterdayCursor);
  const yesterdayActive = activeDays.has(yesterdayKey);

  if (!todayActive && !yesterdayActive) {
    // Most recent active day is 2+ days ago — streak is broken
    return 0;
  }

  // Start counting from the most recent active day backwards
  let startKey: string;
  let startCursor: Date;
  if (todayActive) {
    startKey = todayKey;
    startCursor = cursor;
  } else {
    // Today has no reviews but yesterday is active — streak is alive (at-risk)
    startKey = yesterdayKey;
    startCursor = yesterdayCursor;
  }

  // Verify startKey is actually active (sanity — should always be true at this point)
  if (!activeDays.has(startKey)) return 0;

  // Walk backwards counting consecutive active days
  let count = 0;
  const walk = new Date(startCursor);
  walk.setHours(12, 0, 0, 0);

  while (activeDays.has(dayKeyLocal(walk))) {
    count++;
    walk.setDate(walk.getDate() - 1);
  }

  return count;
}

/**
 * Aggregate today's review stats from a full review list.
 *
 * Returns:
 * - reviewed: count of reviews on the same local calendar day as `now`
 * - again: count of those reviews with rating === 'again'
 *
 * Accuracy can be derived downstream as (reviewed - again) / reviewed.
 */
export function computeTodayStats(
  reviews: { reviewed_at: Date; rating: string }[],
  now: Date,
): { reviewed: number; again: number } {
  const todayKey = dayKeyLocal(now);
  const todayReviews = reviews.filter((r) => dayKeyLocal(r.reviewed_at) === todayKey);
  return {
    reviewed: todayReviews.length,
    again: todayReviews.filter((r) => r.rating === 'again').length,
  };
}
