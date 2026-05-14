import { Hono } from 'hono';
import { z } from 'zod';
import { db, cards, reviews } from '@portuguese-app/db';
import { eq } from 'drizzle-orm';
import { createEmptyCard, fsrs, generatorParameters, Grade, Rating, State } from 'ts-fsrs';

export const reviewsRoute = new Hono();

const ReviewInput = z.object({
  card_id: z.number().int(),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  duration_ms: z.number().int().optional(),
});

const RATING_MAP: Record<string, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const STATE_MAP: Record<State, 'new' | 'learning' | 'review' | 'relearning'> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const f = fsrs(generatorParameters({ enable_fuzz: false }));

reviewsRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = ReviewInput.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const { card_id, rating, duration_ms } = parsed.data;

  const card = await db.query.cards.findFirst({ where: eq(cards.id, card_id) });
  if (!card) return c.json({ error: 'card not found' }, 404);

  const grade = RATING_MAP[rating];
  if (!grade) return c.json({ error: 'invalid rating' }, 400);

  const fsrsCard = {
    ...createEmptyCard(),
    stability: card.stability ?? 0,
    difficulty: card.difficulty ?? 0,
    due: card.due_at,
    last_review: card.last_reviewed_at ?? undefined,
    reps: card.reps,
    lapses: card.lapses,
    state:
      card.state === 'new'
        ? State.New
        : card.state === 'learning'
          ? State.Learning
          : card.state === 'review'
            ? State.Review
            : State.Relearning,
  };

  const { card: next, log } = f.next(fsrsCard, new Date(), grade);

  const stateBefore = card.state;
  const stateAfter = STATE_MAP[next.state] ?? 'new';

  await db
    .update(cards)
    .set({
      stability: next.stability,
      difficulty: next.difficulty,
      due_at: next.due,
      state: stateAfter,
      reps: next.reps,
      lapses: next.lapses,
      last_reviewed_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(cards.id, card_id));

  await db.insert(reviews).values({
    card_id,
    rating,
    duration_ms,
    state_before: stateBefore,
    state_after: stateAfter,
    scheduled_days: log.scheduled_days,
  });

  return c.json({ next_due_at: next.due.toISOString() });
});
