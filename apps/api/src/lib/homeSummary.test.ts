/**
 * homeSummary.test.ts — Unit tests for the pure streak + today-stats date logic.
 *
 * Uses vitest describe/it/expect. No @types/jest needed.
 * Run: corepack pnpm vitest run apps/api/src/lib/homeSummary.test.ts
 */
import { describe, it, expect } from 'vitest';
import { dayKeyLocal, localDayStart, computeStreak, computeTodayStats } from './homeSummary';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a Date that is `daysAgo` calendar days before `now` at noon local time. */
function daysAgoFrom(now: Date, daysAgo: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0); // noon local time — clearly within that calendar day
  return d;
}

// ─── dayKeyLocal ──────────────────────────────────────────────────────────────

describe('dayKeyLocal', () => {
  it('returns the same key for two timestamps on the same local calendar day', () => {
    const now = new Date();
    const morning = new Date(now);
    morning.setHours(0, 1, 0, 0);
    const evening = new Date(now);
    evening.setHours(23, 59, 0, 0);
    expect(dayKeyLocal(morning)).toBe(dayKeyLocal(evening));
  });

  it('returns different keys for timestamps on consecutive days', () => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    expect(dayKeyLocal(today)).not.toBe(dayKeyLocal(yesterday));
  });

  it('returns a string in YYYY-MM-DD format', () => {
    const d = new Date(2024, 0, 5, 10, 0, 0); // Jan 5 2024 local
    expect(dayKeyLocal(d)).toBe('2024-01-05');
  });
});

// ─── localDayStart ────────────────────────────────────────────────────────────

describe('localDayStart', () => {
  it('returns midnight (00:00:00.000) of the local date', () => {
    const now = new Date(2024, 5, 15, 14, 30, 45, 123); // June 15 2024 14:30:45.123 local
    const start = localDayStart(now);
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(5); // June
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });
});

// ─── computeStreak ────────────────────────────────────────────────────────────

describe('computeStreak', () => {
  it('returns 0 for empty input', () => {
    const now = new Date();
    expect(computeStreak([], now)).toBe(0);
  });

  it('returns 3 for reviews on today, yesterday, and 2 days ago', () => {
    const now = new Date();
    const dates = [
      daysAgoFrom(now, 0), // today
      daysAgoFrom(now, 1), // yesterday
      daysAgoFrom(now, 2), // 2 days ago
    ];
    expect(computeStreak(dates, now)).toBe(3);
  });

  it('returns 2 when reviews exist on yesterday and 2 days ago but none today (alive, at-risk)', () => {
    const now = new Date();
    now.setHours(8, 0, 0, 0); // morning — streak is alive but nothing reviewed yet
    const dates = [
      daysAgoFrom(now, 1), // yesterday
      daysAgoFrom(now, 2), // 2 days ago
    ];
    expect(computeStreak(dates, now)).toBe(2);
  });

  it('returns 0 when reviews only exist 3 days ago (streak broken)', () => {
    const now = new Date();
    const dates = [
      daysAgoFrom(now, 3), // 3 days ago — gap of 2 days breaks the streak
    ];
    expect(computeStreak(dates, now)).toBe(0);
  });

  it('counts multiple reviews on the same day as one active day', () => {
    const now = new Date();
    const today1 = new Date(now);
    today1.setHours(9, 0, 0, 0);
    const today2 = new Date(now);
    today2.setHours(15, 0, 0, 0);
    const today3 = new Date(now);
    today3.setHours(21, 0, 0, 0);
    // Three reviews today only → streak of 1
    expect(computeStreak([today1, today2, today3], now)).toBe(1);
  });

  it('counts streak correctly with multiple reviews per day over multiple days', () => {
    const now = new Date();
    const d = (daysAgo: number, hour: number): Date => {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - daysAgo);
      dt.setHours(hour, 0, 0, 0);
      return dt;
    };
    // 2 reviews today, 3 yesterday, 1 two days ago
    const dates = [d(0, 9), d(0, 18), d(1, 10), d(1, 14), d(1, 20), d(2, 11)];
    expect(computeStreak(dates, now)).toBe(3);
  });

  it('returns 1 when only today has reviews', () => {
    const now = new Date();
    const today = daysAgoFrom(now, 0);
    expect(computeStreak([today], now)).toBe(1);
  });
});

// ─── computeTodayStats ────────────────────────────────────────────────────────

describe('computeTodayStats', () => {
  it('returns {reviewed:0, again:0} for empty input', () => {
    const now = new Date();
    expect(computeTodayStats([], now)).toEqual({ reviewed: 0, again: 0 });
  });

  it('counts only reviews from today (same local day) and ignores yesterday', () => {
    const now = new Date();
    const todayNoon = new Date(now);
    todayNoon.setHours(12, 0, 0, 0);
    const yesterdayNoon = new Date(now);
    yesterdayNoon.setDate(now.getDate() - 1);
    yesterdayNoon.setHours(12, 0, 0, 0);

    const reviews = [
      { reviewed_at: todayNoon, rating: 'good' },
      { reviewed_at: todayNoon, rating: 'again' },
      { reviewed_at: yesterdayNoon, rating: 'hard' }, // should be ignored
    ];
    const result = computeTodayStats(reviews, now);
    expect(result.reviewed).toBe(2);
    expect(result.again).toBe(1);
  });

  it('counts all ratings correctly', () => {
    const now = new Date();
    const todayMorning = new Date(now);
    todayMorning.setHours(8, 0, 0, 0);
    const todayEvening = new Date(now);
    todayEvening.setHours(20, 0, 0, 0);

    const reviews = [
      { reviewed_at: todayMorning, rating: 'again' },
      { reviewed_at: todayMorning, rating: 'again' },
      { reviewed_at: todayEvening, rating: 'good' },
      { reviewed_at: todayEvening, rating: 'easy' },
      { reviewed_at: todayEvening, rating: 'hard' },
    ];
    const result = computeTodayStats(reviews, now);
    expect(result.reviewed).toBe(5);
    expect(result.again).toBe(2);
  });

  it('returns {reviewed:0, again:0} when all reviews are from yesterday', () => {
    const now = new Date();
    const yesterdayNoon = new Date(now);
    yesterdayNoon.setDate(now.getDate() - 1);
    yesterdayNoon.setHours(12, 0, 0, 0);

    const reviews = [
      { reviewed_at: yesterdayNoon, rating: 'good' },
      { reviewed_at: yesterdayNoon, rating: 'hard' },
    ];
    expect(computeTodayStats(reviews, now)).toEqual({ reviewed: 0, again: 0 });
  });
});
