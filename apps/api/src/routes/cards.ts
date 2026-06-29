import { Hono } from 'hono';
import { z } from 'zod';
import { db, pending_cards, lemmas, cards, audio_clips, reviews } from '@portuguese-app/db';
import { eq, and } from 'drizzle-orm';
import { synthesize } from '../../../mobile/src/providers/tts.js';
import { contentHash } from '../lib/audio.js';
import { V0_USER_ID } from '../lib/constants.js';

export const cardsRoute = new Hono();

const ApproveInput = z.object({
  pending_card_id: z.number().int(),
  selected_image_url: z.string().url(),
  selected_image_attribution: z.string(),
  selected_sentence: z.string().min(1),
  edits: z
    .object({
      stress_marker: z.string().optional(),
      usage_context: z.string().optional(),
      sounds_like: z.string().nullable().optional(),
      sentence_gloss_en: z.string().optional(),
      source_tag: z.string().optional(),
    })
    .optional(),
});

/** POST /cards — approve a pending card and create the final card row */
cardsRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = ApproveInput.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const {
    pending_card_id,
    selected_image_url,
    selected_image_attribution,
    selected_sentence,
    edits,
  } = parsed.data;

  const pending = await db.query.pending_cards.findFirst({
    where: eq(pending_cards.id, pending_card_id),
  });

  if (!pending) return c.json({ error: 'pending_card not found' }, 404);
  if (pending.status !== 'ready_for_review')
    return c.json(
      { error: `pending_card status is '${pending.status}', expected 'ready_for_review'` },
      409,
    );

  const draft = pending.draft_json as {
    fields: {
      lemma: string;
      gender: 'masculine' | 'feminine' | 'common';
      gendered_form: string;
      stress_marker: string;
      usage_context: string;
      register_tag: 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar';
      sounds_like: string | null;
    };
  };

  // Synthesize sentence audio — sentence is the card's only audio asset
  const sentenceAudio = await synthesize(selected_sentence);
  const sentenceHash = contentHash(selected_sentence);
  await db
    .insert(audio_clips)
    .values({
      content_hash: sentenceHash,
      text: selected_sentence,
      provider: 'narakeet',
      voice_id: 'felipe',
      storage_url: sentenceAudio.audioUrl,
      duration_ms: sentenceAudio.durationMs,
    })
    .onConflictDoNothing();

  // Upsert lemma (dedup by user + headword)
  await db
    .insert(lemmas)
    .values({ user_id: V0_USER_ID, headword: draft.fields.lemma })
    .onConflictDoNothing();

  const lemma = await db.query.lemmas.findFirst({
    where: eq(lemmas.headword, draft.fields.lemma),
  });

  if (!lemma) throw new Error('Failed to resolve lemma');

  const [card] = await db
    .insert(cards)
    .values({
      user_id: V0_USER_ID,
      card_kind: 'word',
      lemma_id: lemma.id,
      headword: draft.fields.lemma,
      gendered_form: draft.fields.gendered_form,
      gender: draft.fields.gender,
      stress_marker: edits?.stress_marker ?? draft.fields.stress_marker,
      usage_context: edits?.usage_context ?? draft.fields.usage_context,
      register_tag: draft.fields.register_tag,
      sounds_like: edits?.sounds_like !== undefined ? edits.sounds_like : draft.fields.sounds_like,
      image_url: selected_image_url,
      image_attribution: selected_image_attribution,
      sentence_pt: selected_sentence,
      sentence_gloss_en: edits?.sentence_gloss_en,
      source_tag: edits?.source_tag ?? null,
      sentence_audio_clip_hash: sentenceHash,
    })
    .returning({ id: cards.id });

  if (!card) throw new Error('Failed to insert card');

  await db
    .update(pending_cards)
    .set({ status: 'discarded', updated_at: new Date() })
    .where(eq(pending_cards.id, pending_card_id));

  return c.json({ card_id: card.id }, 201);
});

/** GET /cards — all cards for the user, newest-first (includes suspended) */
cardsRoute.get('/', async (c) => {
  const allCards = await db.query.cards.findMany({
    where: (table, { eq }) => eq(table.user_id, V0_USER_ID),
    orderBy: (table, { desc }) => [desc(table.created_at)],
  });
  const result = allCards.map((card) => ({
    ...card,
    audio_url: card.audio_clip_hash ? `/audio/${card.audio_clip_hash}` : null,
    sentence_audio_url: card.sentence_audio_clip_hash
      ? `/audio/${card.sentence_audio_clip_hash}`
      : null,
  }));
  return c.json({ cards: result });
});

/** GET /cards/due — cards due for review today (excludes suspended cards) */
cardsRoute.get('/due', async (c) => {
  const due = await db.query.cards.findMany({
    where: (table, { and, eq, lte, isNull }) =>
      and(eq(table.user_id, V0_USER_ID), lte(table.due_at, new Date()), isNull(table.suspended_at)),
    orderBy: (table, { asc }) => [asc(table.due_at)],
  });

  const result = due.map((card) => ({
    ...card,
    audio_url: card.audio_clip_hash ? `/audio/${card.audio_clip_hash}` : null,
    sentence_audio_url: card.sentence_audio_clip_hash
      ? `/audio/${card.sentence_audio_clip_hash}`
      : null,
  }));

  return c.json({ cards: result });
});

/** GET /cards/:id — single card for the detail screen */
cardsRoute.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const card = await db.query.cards.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, id), eq(table.user_id, V0_USER_ID)),
  });
  if (!card) return c.json({ error: 'Not found' }, 404);
  return c.json({
    card: {
      ...card,
      audio_url: card.audio_clip_hash ? `/audio/${card.audio_clip_hash}` : null,
      sentence_audio_url: card.sentence_audio_clip_hash
        ? `/audio/${card.sentence_audio_clip_hash}`
        : null,
    },
  });
});

const PatchCardInput = z.object({
  sentence_pt: z.string().min(1).max(500).optional(),
  source_tag: z.string().nullable().optional(),
});

/** PATCH /cards/:id — edit sentence_pt and/or source_tag; re-synthesizes audio when sentence changes */
cardsRoute.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = PatchCardInput.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const existing = await db.query.cards.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, id), eq(table.user_id, V0_USER_ID)),
  });
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const toUpdate: {
    sentence_pt?: string | null;
    source_tag?: string | null;
    sentence_audio_clip_hash?: string | null;
  } = {};

  if (parsed.data.source_tag !== undefined) {
    toUpdate.source_tag = parsed.data.source_tag;
  }

  if (parsed.data.sentence_pt !== undefined) {
    toUpdate.sentence_pt = parsed.data.sentence_pt;
    if (parsed.data.sentence_pt !== existing.sentence_pt) {
      const newSentence = parsed.data.sentence_pt;
      const sentenceAudio = await synthesize(newSentence);
      const sentenceHash = contentHash(newSentence);
      await db
        .insert(audio_clips)
        .values({
          content_hash: sentenceHash,
          text: newSentence,
          provider: 'narakeet',
          voice_id: 'felipe',
          storage_url: sentenceAudio.audioUrl,
          duration_ms: sentenceAudio.durationMs,
        })
        .onConflictDoNothing();
      toUpdate.sentence_audio_clip_hash = sentenceHash;
    }
  }

  if (Object.keys(toUpdate).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  await db
    .update(cards)
    .set(toUpdate)
    .where(and(eq(cards.id, id), eq(cards.user_id, V0_USER_ID)));

  const updated = await db.query.cards.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, id), eq(table.user_id, V0_USER_ID)),
  });

  return c.json({
    card: {
      ...updated,
      audio_url: updated?.audio_clip_hash ? `/audio/${updated.audio_clip_hash}` : null,
      sentence_audio_url: updated?.sentence_audio_clip_hash
        ? `/audio/${updated.sentence_audio_clip_hash}`
        : null,
    },
  });
});

const SuspendInput = z.object({ suspended: z.boolean() });

/** PATCH /cards/:id/suspend — toggle suspended_at (null = active, timestamp = suspended) */
cardsRoute.patch('/:id/suspend', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = SuspendInput.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  await db
    .update(cards)
    .set({ suspended_at: parsed.data.suspended ? new Date() : null })
    .where(and(eq(cards.id, id), eq(cards.user_id, V0_USER_ID)));

  return c.json({ ok: true });
});

/** DELETE /cards/:id — delete reviews first (FK constraint), then the card */
cardsRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  await db.delete(reviews).where(eq(reviews.card_id, id));
  await db.delete(cards).where(and(eq(cards.id, id), eq(cards.user_id, V0_USER_ID)));
  return c.json({ ok: true });
});
