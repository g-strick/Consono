import { Hono } from 'hono';
import { db, cards, reviews } from '@portuguese-app/db';
import { asc, desc, inArray } from 'drizzle-orm';
import { V0_USER_ID } from '../lib/constants.js';
import { computeStreak, computeTodayStats } from '../lib/homeSummary.js';

export const homeRoute = new Hono();

/**
 * GET /home/summary — aggregated per-user home screen data.
 *
 * Security: reviews has no user_id. All review reads are scoped to the current user
 * via an inArray over this user's card ids (T-02-01 mitigation).
 */
homeRoute.get('/summary', async (c) => {
  // 1. Total cards (D-05)
  const userCards = await db.query.cards.findMany({
    where: (table, { eq }) => eq(table.user_id, V0_USER_ID),
  });
  const totalCards = userCards.length;

  // 2. Recent cards (D-08): 3 most-recently-created, not due cards
  const recentCardRows = await db.query.cards.findMany({
    where: (table, { eq }) => eq(table.user_id, V0_USER_ID),
    orderBy: [desc(cards.created_at)],
    limit: 3,
  });
  const recentCards = recentCardRows.map((card) => ({
    id: card.id,
    headword: card.headword,
    sentence_pt: card.sentence_pt,
    gender: card.gender,
    state: card.state,
    created_at: card.created_at.toISOString(),
  }));

  // 3. nextDueAt (D-12): earliest future due_at
  const nextDueCard = await db.query.cards.findFirst({
    where: (table, { and, eq, gt }) =>
      and(eq(table.user_id, V0_USER_ID), gt(table.due_at, new Date())),
    orderBy: [asc(cards.due_at)],
  });
  const nextDueAt = nextDueCard ? nextDueCard.due_at.toISOString() : null;

  // 4. Reviews scoped to user — SECURITY: reviews has no user_id (T-02-01)
  // Collect this user's card ids, then query reviews filtered by those ids.
  const userCardIds = userCards.map((card) => card.id);
  const userReviews =
    userCardIds.length > 0
      ? await db.query.reviews.findMany({
          where: inArray(reviews.card_id, userCardIds),
        })
      : [];

  // 5. Streak (D-01, D-02)
  const reviewedAtDates = userReviews.map((r) => r.reviewed_at);
  const streakCount = computeStreak(reviewedAtDates, new Date());
  const todayStats = computeTodayStats(
    userReviews.map((r) => ({ reviewed_at: r.reviewed_at, rating: r.rating })),
    new Date(),
  );
  const streak = {
    count: streakCount,
    active: streakCount > 0,
    reviewedToday: todayStats.reviewed > 0,
  };

  return c.json({
    totalCards,
    streak,
    todayStats: {
      reviewed: todayStats.reviewed,
      again: todayStats.again,
    },
    nextDueAt,
    recentCards,
  });
});
