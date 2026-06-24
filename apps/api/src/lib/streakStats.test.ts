/**
 * streakStats.test.ts — Unit tests for streak detail aggregation.
 *
 * Uses vitest describe/it/expect. No @types/jest needed.
 * Run: corepack pnpm exec vitest run apps/api/src/lib/streakStats.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  computeRetention,
  computeDaysActive,
  computeReviewsInWindow,
  computeBestRuns,
  computePerDayCount,
  computeHeatLevels,
} from './streakStats';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a Date that is `daysAgo` calendar days before `now` at noon local time. */
function daysAgoFrom(now: Date, daysAgo: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0); // noon local time — clearly within that calendar day
  return d;
}

type ReviewRow = {
  reviewed_at: Date;
  rating: 'again' | 'hard' | 'good' | 'easy';
  state_before: 'new' | 'learning' | 'review' | 'relearning';
};

// ─── computeRetention (D-09) ─────────────────────────────────────────────────

describe('computeRetention', () => {
  it('returns 0 when no reviews in window', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 30);
    const windowEnd = now;
    expect(computeRetention([], windowStart, windowEnd)).toBe(0);
  });

  it('returns 0 when no state_before=review reps in window (D-09)', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 30);
    const windowEnd = now;
    const reviews: ReviewRow[] = [
      { reviewed_at: daysAgoFrom(now, 5), rating: 'good', state_before: 'new' },
      { reviewed_at: daysAgoFrom(now, 4), rating: 'easy', state_before: 'learning' },
      { reviewed_at: daysAgoFrom(now, 3), rating: 'hard', state_before: 'relearning' },
    ];
    expect(computeRetention(reviews, windowStart, windowEnd)).toBe(0);
  });

  it('counts only state_before=review reps in denominator (D-09)', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 30);
    const windowEnd = now;
    const reviews: ReviewRow[] = [
      { reviewed_at: daysAgoFrom(now, 5), rating: 'good', state_before: 'review' }, // recalled
      { reviewed_at: daysAgoFrom(now, 4), rating: 'good', state_before: 'new' }, // excluded
      { reviewed_at: daysAgoFrom(now, 3), rating: 'again', state_before: 'review' }, // not recalled
    ];
    // denominator = 2 (both state_before=review), numerator = 1 (rating!='again')
    expect(computeRetention(reviews, windowStart, windowEnd)).toBeCloseTo(0.5);
  });

  it('excludes rating=again from numerator (D-09)', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 30);
    const windowEnd = now;
    const reviews: ReviewRow[] = [
      { reviewed_at: daysAgoFrom(now, 5), rating: 'again', state_before: 'review' },
      { reviewed_at: daysAgoFrom(now, 4), rating: 'again', state_before: 'review' },
      { reviewed_at: daysAgoFrom(now, 3), rating: 'again', state_before: 'review' },
    ];
    // All again → 0 recalled out of 3 due
    expect(computeRetention(reviews, windowStart, windowEnd)).toBe(0);
  });

  it('returns 1 when all state_before=review reps are recalled', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 30);
    const windowEnd = now;
    const reviews: ReviewRow[] = [
      { reviewed_at: daysAgoFrom(now, 5), rating: 'good', state_before: 'review' },
      { reviewed_at: daysAgoFrom(now, 4), rating: 'easy', state_before: 'review' },
      { reviewed_at: daysAgoFrom(now, 3), rating: 'hard', state_before: 'review' },
    ];
    expect(computeRetention(reviews, windowStart, windowEnd)).toBe(1);
  });

  it('excludes reviews outside window boundaries', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 7);
    const windowEnd = now;
    const reviews: ReviewRow[] = [
      { reviewed_at: daysAgoFrom(now, 5), rating: 'good', state_before: 'review' }, // in window
      { reviewed_at: daysAgoFrom(now, 10), rating: 'again', state_before: 'review' }, // outside window
    ];
    // Only in-window review counts: 1/1 = 1.0
    expect(computeRetention(reviews, windowStart, windowEnd)).toBe(1);
  });
});

// ─── computeDaysActive (D-07) ─────────────────────────────────────────────────

describe('computeDaysActive', () => {
  it('returns 0 for empty input', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 30);
    expect(computeDaysActive([], windowStart, now)).toBe(0);
  });

  it('counts distinct days with at least 1 review', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 30);
    const dates = [
      daysAgoFrom(now, 5),
      daysAgoFrom(now, 5), // duplicate same day
      daysAgoFrom(now, 3),
    ];
    expect(computeDaysActive(dates, windowStart, now)).toBe(2);
  });

  it('excludes reviews before windowStart', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 7);
    const dates = [
      daysAgoFrom(now, 5), // in window
      daysAgoFrom(now, 10), // outside window
    ];
    expect(computeDaysActive(dates, windowStart, now)).toBe(1);
  });

  it('excludes reviews after windowEnd', () => {
    const windowEnd = daysAgoFrom(new Date(), 2);
    const windowStart = daysAgoFrom(new Date(), 10);
    const dates = [
      daysAgoFrom(new Date(), 5), // in window
      daysAgoFrom(new Date(), 1), // after windowEnd
    ];
    expect(computeDaysActive(dates, windowStart, windowEnd)).toBe(1);
  });
});

// ─── computeReviewsInWindow (D-07) ───────────────────────────────────────────

describe('computeReviewsInWindow', () => {
  it('returns 0 for empty input', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 30);
    expect(computeReviewsInWindow([], windowStart, now)).toBe(0);
  });

  it('counts all reviews within the window (including duplicates on same day)', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 30);
    const dates = [
      daysAgoFrom(now, 5),
      daysAgoFrom(now, 5), // same day, counts separately
      daysAgoFrom(now, 3),
    ];
    expect(computeReviewsInWindow(dates, windowStart, now)).toBe(3);
  });

  it('excludes reviews before windowStart', () => {
    const now = new Date();
    const windowStart = daysAgoFrom(now, 7);
    const dates = [
      daysAgoFrom(now, 5), // in window
      daysAgoFrom(now, 10), // outside window
      daysAgoFrom(now, 3), // in window
    ];
    expect(computeReviewsInWindow(dates, windowStart, now)).toBe(2);
  });

  it('excludes reviews after windowEnd', () => {
    const windowEnd = daysAgoFrom(new Date(), 2);
    const windowStart = daysAgoFrom(new Date(), 10);
    const dates = [
      daysAgoFrom(new Date(), 5), // in window
      daysAgoFrom(new Date(), 1), // after windowEnd
      daysAgoFrom(new Date(), 8), // in window
    ];
    expect(computeReviewsInWindow(dates, windowStart, windowEnd)).toBe(2);
  });
});

// ─── computeBestRuns (D-04/05/06) ────────────────────────────────────────────

describe('computeBestRuns', () => {
  it('returns empty array for no reviews (D-06 empty state)', () => {
    const now = new Date();
    expect(computeBestRuns([], now)).toEqual([]);
  });

  it('marks the current run with current: true when today has reviews (D-05)', () => {
    const now = new Date();
    const dates = [
      daysAgoFrom(now, 0), // today
      daysAgoFrom(now, 1), // yesterday
    ];
    const runs = computeBestRuns(dates, now);
    expect(runs.length).toBeGreaterThan(0);
    const currentRun = runs.find((r) => r.current);
    expect(currentRun).toBeDefined();
    expect(currentRun?.days).toBe(2);
  });

  it('marks run current when last active day is yesterday (grace period matches computeStreak)', () => {
    const now = new Date();
    now.setHours(8, 0, 0, 0); // early morning, no reviews yet today
    const dates = [
      daysAgoFrom(now, 1), // yesterday
      daysAgoFrom(now, 2),
    ];
    const runs = computeBestRuns(dates, now);
    const currentRun = runs.find((r) => r.current);
    expect(currentRun).toBeDefined();
  });

  it('returns top 5 runs ordered longest-first (D-04)', () => {
    const now = new Date();
    // Build 5 historical runs of decreasing length
    // Run 1: days 1-10 (10 days)
    // Run 2: days 20-27 (8 days)
    // Run 3: days 36-41 (6 days)
    // Run 4: days 50-54 (5 days)
    // Run 5: days 63-66 (4 days)
    const dates: Date[] = [];
    for (let i = 1; i <= 10; i++) dates.push(daysAgoFrom(now, i));
    // gap of 9 days
    for (let i = 20; i <= 27; i++) dates.push(daysAgoFrom(now, i));
    // gap
    for (let i = 36; i <= 41; i++) dates.push(daysAgoFrom(now, i));
    // gap
    for (let i = 50; i <= 54; i++) dates.push(daysAgoFrom(now, i));
    // gap
    for (let i = 63; i <= 66; i++) dates.push(daysAgoFrom(now, i));

    const runs = computeBestRuns(dates, now);
    const nonCurrentRuns = runs.filter((r) => !r.current);
    // Should be ordered longest-first
    for (let i = 0; i < nonCurrentRuns.length - 1; i++) {
      expect(nonCurrentRuns[i].days).toBeGreaterThanOrEqual(nonCurrentRuns[i + 1].days);
    }
  });

  it('always includes the current run even when not in top 5 (D-05)', () => {
    const now = new Date();
    // Create 6 longer historical runs, current run is only 1 day
    const dates: Date[] = [];
    // 6 historical runs (each 10 days, separated by gaps)
    for (let block = 0; block < 6; block++) {
      const startDaysAgo = 15 + block * 15;
      for (let d = 0; d < 10; d++) {
        dates.push(daysAgoFrom(now, startDaysAgo + d));
      }
    }
    // Current run: just today (1 day)
    dates.push(daysAgoFrom(now, 0));

    const runs = computeBestRuns(dates, now);
    const currentRun = runs.find((r) => r.current);
    expect(currentRun).toBeDefined();
    expect(currentRun?.days).toBe(1);
    // Total runs should be 6 (top 5 historical + current) since current is not in top 5
    expect(runs.length).toBe(6);
  });

  it('breaks equal-length tie by most-recent end date (D-05)', () => {
    const now = new Date();
    // Two runs of equal length: recent (days 1-3) and older (days 20-22)
    // Both 3 days. Recent one should rank higher.
    const dates: Date[] = [];
    // Recent run: days 1-3 ago
    for (let i = 1; i <= 3; i++) dates.push(daysAgoFrom(now, i));
    // gap of ~16 days
    // Older run: days 20-22 ago
    for (let i = 20; i <= 22; i++) dates.push(daysAgoFrom(now, i));

    const runs = computeBestRuns(dates, now);
    // The recent run (ending 1 day ago) should come before the older run (ending 20 days ago)
    const nonCurrentRuns = runs.filter((r) => !r.current);
    expect(nonCurrentRuns.length).toBeGreaterThanOrEqual(2);
    // First run should have a more recent end date than second run
    expect(nonCurrentRuns[0].end.getTime()).toBeGreaterThan(nonCurrentRuns[1].end.getTime());
  });

  it('a 1-day run appears in results (D-06)', () => {
    const now = new Date();
    const dates = [
      daysAgoFrom(now, 0), // today only — 1-day run
    ];
    const runs = computeBestRuns(dates, now);
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0].days).toBe(1);
  });

  it('handles cross-month consecutive days as a single run', () => {
    // Use a fixed date to test month boundary: Jan 31 + Feb 1
    const feb2 = new Date(2026, 1, 2, 12, 0, 0); // Feb 2 local
    const dates = [
      new Date(2026, 0, 31, 12, 0, 0), // Jan 31
      new Date(2026, 1, 1, 12, 0, 0), // Feb 1
    ];
    const runs = computeBestRuns(dates, feb2);
    // Jan 31 + Feb 1 = 2 consecutive days, should be one run of 2
    const run = runs.find((r) => r.days === 2);
    expect(run).toBeDefined();
  });
});

// ─── computePerDayCount (D-07) ───────────────────────────────────────────────

describe('computePerDayCount', () => {
  it('returns empty map for no reviews', () => {
    expect(computePerDayCount([])).toEqual(new Map());
  });

  it('counts reviews per local day key', () => {
    const now = new Date();
    const dates = [
      daysAgoFrom(now, 2),
      daysAgoFrom(now, 2), // two on same day
      daysAgoFrom(now, 1),
    ];
    const map = computePerDayCount(dates);
    // Should have 2 distinct days
    expect(map.size).toBe(2);
    const dayKey2 = `${daysAgoFrom(now, 2).getFullYear()}-${String(daysAgoFrom(now, 2).getMonth() + 1).padStart(2, '0')}-${String(daysAgoFrom(now, 2).getDate()).padStart(2, '0')}`;
    expect(map.get(dayKey2)).toBe(2);
  });
});

// ─── computeHeatLevels (Claude's Discretion: quartile-based) ─────────────────

describe('computeHeatLevels', () => {
  it('returns empty map for empty input', () => {
    expect(computeHeatLevels(new Map())).toEqual(new Map());
  });

  it('returns only values in {0, 1, 2, 3}', () => {
    const perDay = new Map([
      ['2026-01-01', 1],
      ['2026-01-02', 5],
      ['2026-01-03', 10],
      ['2026-01-04', 20],
      ['2026-01-05', 0],
    ]);
    const levels = computeHeatLevels(perDay);
    for (const [, level] of levels) {
      expect([0, 1, 2, 3]).toContain(level);
    }
  });

  it('assigns level 0 to days with 0 count', () => {
    const perDay = new Map([
      ['2026-01-01', 0],
      ['2026-01-02', 5],
    ]);
    const levels = computeHeatLevels(perDay);
    expect(levels.get('2026-01-01')).toBe(0);
  });

  it('assigns level 3 to single distinct non-zero value', () => {
    const perDay = new Map([
      ['2026-01-01', 5],
      ['2026-01-02', 5],
      ['2026-01-03', 5],
    ]);
    const levels = computeHeatLevels(perDay);
    expect(levels.get('2026-01-01')).toBe(3);
    expect(levels.get('2026-01-02')).toBe(3);
    expect(levels.get('2026-01-03')).toBe(3);
  });

  it('correctly buckets multiple values into levels 0-3 via quartiles', () => {
    // 8 non-zero values: 1, 2, 3, 4, 5, 6, 7, 8
    const perDay = new Map<string, number>([
      ['2026-01-01', 1],
      ['2026-01-02', 2],
      ['2026-01-03', 3],
      ['2026-01-04', 4],
      ['2026-01-05', 5],
      ['2026-01-06', 6],
      ['2026-01-07', 7],
      ['2026-01-08', 8],
    ]);
    const levels = computeHeatLevels(perDay);
    // All levels should be in {1, 2, 3} for non-zero values (0 is only for count=0)
    for (const [, level] of levels) {
      expect([1, 2, 3]).toContain(level);
    }
    // Higher count days should have higher or equal level
    const level1 = levels.get('2026-01-01')!;
    const level8 = levels.get('2026-01-08')!;
    expect(level8).toBeGreaterThanOrEqual(level1);
  });
});
