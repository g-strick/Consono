import { Hono } from 'hono';
import { z } from 'zod';
import { db, pending_cards, lemmas, cards } from '@portuguese-app/db';
import { eq } from 'drizzle-orm';
import { V0_USER_ID } from '../lib/constants.js';

export const cardsRoute = new Hono();

const ApproveInput = z.object({
  pending_card_id: z.number().int(),
  selected_image_url: z.string().url(),
  selected_image_attribution: z.string(),
  selected_sentence: z.string(),
  sentence_audio_clip_hash: z.string().optional(),
  edits: z
    .object({
      stress_marker: z.string().optional(),
      usage_context: z.string().optional(),
      sounds_like: z.string().nullable().optional(),
      sentence_gloss_en: z.string().optional(),
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
    sentence_audio_clip_hash,
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
    audio_hash: string;
  };

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
      audio_clip_hash: draft.audio_hash,
      sentence_pt: selected_sentence,
      sentence_gloss_en: edits?.sentence_gloss_en,
      sentence_audio_clip_hash: sentence_audio_clip_hash,
    })
    .returning({ id: cards.id });

  if (!card) throw new Error('Failed to insert card');

  await db
    .update(pending_cards)
    .set({ status: 'discarded', updated_at: new Date() })
    .where(eq(pending_cards.id, pending_card_id));

  return c.json({ card_id: card.id }, 201);
});

/** GET /cards/due — cards due for review today */
cardsRoute.get('/due', async (c) => {
  const due = await db.query.cards.findMany({
    where: (table, { and, eq, lte }) =>
      and(eq(table.user_id, V0_USER_ID), lte(table.due_at, new Date())),
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
