import { Hono } from 'hono';
import { db, reviews } from '@portuguese-app/db';
import { inArray } from 'drizzle-orm';
import { V0_USER_ID } from '../lib/constants.js';
import {
  computeRetention,
  computeBestRuns,
  computePerDayCount,
  computeDaysActive,
  computeReviewsInWindow,
  computeHeatLevels,
  type ReviewRow,
} from '../lib/streakStats.js';
import { computeStreak, localDayStart, dayKeyLocal } from '../lib/homeSummary.js';

export const streakRoute = new Hono();

/**
 * GET /streak/stats — aggregated streak detail for all three periods.
 *
 * Returns month/year/lifetime stats in one payload for instant period toggle (D-Claude).
 *
 * Security: reviews has no user_id — scope via inArray over this user's card ids (T-03-02).
 *
 * Period windows (D-07):
 *   month    = first of current calendar month → now
 *   year     = now − 53 weeks (53 × 7 days) → now
 *   lifetime = all time (earliest reviewed_at → now)
 *
 * Retention (D-09): True FSRS retention fraction 0–1; multiplied ×100 before returning.
 */
streakRoute.get('/stats', async (c) => {
  const now = new Date();

  // ── 1. Fetch user cards ────────────────────────────────────────────────────
  const userCards = await db.query.cards.findMany({
    where: (table, { eq }) => eq(table.user_id, V0_USER_ID),
  });

  // ── 2. SECURITY: scope reviews to this user via card ids (T-03-02) ─────────
  const userCardIds = userCards.map((card) => card.id);
  const userReviews: ReviewRow[] =
    userCardIds.length > 0
      ? await db.query.reviews.findMany({
          where: inArray(reviews.card_id, userCardIds),
        })
      : [];

  const reviewedAtDates = userReviews.map((r) => r.reviewed_at);

  // ── 3. Compute period window starts (D-07) ─────────────────────────────────

  // Month: first of current calendar month at local 00:00
  const monthStart = localDayStart(new Date(now.getFullYear(), now.getMonth(), 1));

  // Year: trailing 53 weeks (~371 days) at local 00:00
  const yearStartRaw = new Date(now);
  yearStartRaw.setDate(yearStartRaw.getDate() - 53 * 7);
  const yearStart = localDayStart(yearStartRaw);

  // Lifetime: earliest reviewed_at (or now if no reviews)
  const lifetimeStart =
    reviewedAtDates.length > 0
      ? localDayStart(new Date(Math.min(...reviewedAtDates.map((d) => d.getTime()))))
      : localDayStart(now);

  // ── 4. Shared derived data ─────────────────────────────────────────────────

  // All-time best runs (D-04/05/06) — NOT period-scoped
  const allBestRuns = computeBestRuns(reviewedAtDates, now);

  // All-time longest streak (longestAllTime) — max days from bestRuns
  const longestAllTime = allBestRuns.length > 0 ? Math.max(...allBestRuns.map((r) => r.days)) : 0;

  // Current streak count
  const streakCount = computeStreak(reviewedAtDates, now);

  // All-time retention (lifetime window)
  const retentionAllTimeFraction = computeRetention(userReviews, lifetimeStart, now);

  // ── 5. Helper: longestStreak + longestDates for a specific window ──────────
  function windowLongest(
    windowStart: Date,
    windowEnd: Date,
  ): {
    longestStreak: number;
    longestDates: string | null;
  } {
    // Filter runs to those ending within the window
    const runsInWindow = allBestRuns.filter((r) => {
      const endKey = dayKeyLocal(r.end);
      const windowStartKey = dayKeyLocal(windowStart);
      const windowEndKey = dayKeyLocal(windowEnd);
      return endKey >= windowStartKey && endKey <= windowEndKey;
    });

    if (runsInWindow.length === 0) {
      return { longestStreak: 0, longestDates: null };
    }

    // Pick the longest run in the window (ties by recency — already sorted in computeBestRuns)
    const best = runsInWindow.reduce((a, b) => (b.days > a.days ? b : a));

    const longestDates = formatDateRange(best.start, best.end);
    return { longestStreak: best.days, longestDates };
  }

  // ── 6. Helper: ratingCounts for a window ──────────────────────────────────
  function windowRatingCounts(
    windowStart: Date,
    windowEnd: Date,
  ): { again: number; hard: number; good: number; easy: number } {
    const result = { again: 0, hard: 0, good: 0, easy: 0 };
    for (const r of userReviews) {
      if (isInWindow(r.reviewed_at, windowStart, windowEnd)) {
        result[r.rating]++;
      }
    }
    return result;
  }

  // ── 7. Helper: perDay + heatLevels filtered to a window ───────────────────
  function windowHeatData(
    windowStart: Date,
    windowEnd: Date,
  ): {
    perDay: Record<string, number>;
    heatLevels: Record<string, number>;
  } {
    const datesInWindow = reviewedAtDates.filter((d) => isInWindow(d, windowStart, windowEnd));
    const perDayMap = computePerDayCount(datesInWindow);
    const heatLevelsMap = computeHeatLevels(perDayMap);
    return {
      perDay: Object.fromEntries(perDayMap),
      heatLevels: Object.fromEntries(heatLevelsMap),
    };
  }

  // ── 8. Helper: perMonth buckets ───────────────────────────────────────────
  function buildPerMonth(
    windowStart: Date,
    windowEnd: Date,
  ): Array<{ label: string; count: number }> {
    // Walk month-by-month from windowStart to windowEnd
    const buckets: Array<{ label: string; count: number }> = [];

    const cursor = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
    const endMonth = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), 1);

    while (cursor <= endMonth) {
      const monthBucketStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const monthBucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

      // Cap to the window boundaries
      const effectiveStart = monthBucketStart < windowStart ? windowStart : monthBucketStart;
      const effectiveEnd = monthBucketEnd > windowEnd ? windowEnd : monthBucketEnd;

      const count = computeReviewsInWindow(reviewedAtDates, effectiveStart, effectiveEnd);
      const label = MONTH_LABELS[cursor.getMonth()] ?? 'jan';
      buckets.push({ label, count });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
  }

  // ── 9. Month aggregate (D-07: calendar month = first-of-month → now) ───────
  const monthHeat = windowHeatData(monthStart, now);
  const monthLongest = windowLongest(monthStart, now);
  const monthRetention = computeRetention(userReviews, monthStart, now);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const month = {
    longestStreak: monthLongest.longestStreak,
    longestDates: monthLongest.longestDates,
    retention: Math.round(monthRetention * 100),
    totalReviews: computeReviewsInWindow(reviewedAtDates, monthStart, now),
    daysActive: computeDaysActive(reviewedAtDates, monthStart, now),
    daysInMonth,
    perDay: monthHeat.perDay,
    heatLevels: monthHeat.heatLevels,
    ratingCounts: windowRatingCounts(monthStart, now),
  };

  // ── 10. Year aggregate (D-07: trailing 53 weeks, with daily heat data for YearHeatmap) ──
  const yearHeat = windowHeatData(yearStart, now);
  const yearLongest = windowLongest(yearStart, now);
  const yearRetention = computeRetention(userReviews, yearStart, now);

  // perMonth: 12 trailing months for the reviews bar chart
  const yearPerMonthStart = new Date(now);
  yearPerMonthStart.setMonth(yearPerMonthStart.getMonth() - 11);
  yearPerMonthStart.setDate(1);
  yearPerMonthStart.setHours(0, 0, 0, 0);
  const yearPerMonth = buildPerMonth(yearPerMonthStart, now);

  const year = {
    longestStreak: yearLongest.longestStreak,
    longestDates: yearLongest.longestDates,
    retention: Math.round(yearRetention * 100),
    totalReviews: computeReviewsInWindow(reviewedAtDates, yearStart, now),
    daysActive: computeDaysActive(reviewedAtDates, yearStart, now),
    perDay: yearHeat.perDay, // ~371 daily cells for YearHeatmap (STRK-04)
    heatLevels: yearHeat.heatLevels,
    perMonth: yearPerMonth, // 12-month bar chart
    ratingCounts: windowRatingCounts(yearStart, now),
  };

  // ── 11. Lifetime aggregate (D-07: all time) ───────────────────────────────
  const lifetimeLongest = windowLongest(lifetimeStart, now);
  const lifetimeRetention = computeRetention(userReviews, lifetimeStart, now);
  const firstReviewDate =
    reviewedAtDates.length > 0
      ? dayKeyLocal(new Date(Math.min(...reviewedAtDates.map((d) => d.getTime()))))
      : null;
  const lifetimePerMonth = buildPerMonth(lifetimeStart, now);

  const lifetime = {
    longestStreak: lifetimeLongest.longestStreak,
    longestDates: lifetimeLongest.longestDates,
    retention: Math.round(lifetimeRetention * 100),
    totalReviews: computeReviewsInWindow(reviewedAtDates, lifetimeStart, now),
    daysActive: computeDaysActive(reviewedAtDates, lifetimeStart, now),
    firstReviewDate,
    perMonth: lifetimePerMonth,
    ratingCounts: windowRatingCounts(lifetimeStart, now),
  };

  // ── 12. Bests (D-04/05/06): all-time, top-5 + current, ranked ─────────────
  const bests =
    allBestRuns.length > 0
      ? allBestRuns.map((run, index) => ({
          rank: run.current ? 'current' : index + 1,
          days: run.days,
          startDate: dayKeyLocal(run.start),
          endDate: dayKeyLocal(run.end),
          current: run.current,
        }))
      : [
          // Empty-state single row per UI-SPEC when no reviews
          {
            rank: 1,
            days: 0,
            startDate: dayKeyLocal(now),
            endDate: dayKeyLocal(now),
            current: true,
          },
        ];

  // ── 13. Hero ──────────────────────────────────────────────────────────────
  const hero = {
    streak: streakCount,
    longestAllTime,
    retentionAllTime: Math.round(retentionAllTimeFraction * 100),
  };

  return c.json({ hero, month, year, lifetime, bests });
});

// ─── Module-level helpers ─────────────────────────────────────────────────────

const MONTH_LABELS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/** Returns true when `date` falls within [windowStart, windowEnd] at local-day granularity. */
function isInWindow(date: Date, windowStart: Date, windowEnd: Date): boolean {
  const key = dayKeyLocal(date);
  return key >= dayKeyLocal(windowStart) && key <= dayKeyLocal(windowEnd);
}

/**
 * Format a date range as "mmm d – mmm d" per UI-SPEC copy contract.
 * Example: "jan 4 – jan 21"
 */
function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
  return `${fmt(start)} – ${fmt(end)}`;
}
