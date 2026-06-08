import { Hono } from 'hono';
import { z } from 'zod';
import { db, pending_cards, audio_clips } from '@portuguese-app/db';
import { eq } from 'drizzle-orm';
import { extractWordFields } from '../../../mobile/src/providers/llm.js';
import { synthesize } from '../../../mobile/src/providers/tts.js';
import { searchImages } from '../../../mobile/src/providers/image-search.js';
import { V0_USER_ID } from '../lib/constants.js';
import { contentHash } from '../lib/audio.js';

export const generateRoute = new Hono();

const SentenceAudioInput = z.object({
  sentence: z.string().min(1),
});

generateRoute.post('/sentence-audio', async (c) => {
  const body = await c.req.json();
  const parsed = SentenceAudioInput.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const { sentence } = parsed.data;

  const audio = await synthesize(sentence);
  const hash = contentHash(sentence);

  await db
    .insert(audio_clips)
    .values({
      content_hash: hash,
      text: sentence,
      provider: 'narakeet',
      voice_id: 'felipe',
      storage_url: audio.audioUrl,
      duration_ms: audio.durationMs,
    })
    .onConflictDoNothing();

  return c.json({
    audio_url: `/audio/${hash}`,
    audio_duration_ms: audio.durationMs,
    audio_clip_hash: hash,
  });
});

const GenerateInput = z.object({
  input_text: z.string().min(1),
  kind: z.enum(['word', 'sentence']),
});

generateRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = GenerateInput.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const { input_text, kind } = parsed.data;

  const [pending] = await db
    .insert(pending_cards)
    .values({ user_id: V0_USER_ID, input_text, input_kind: kind, status: 'generating' })
    .returning({ id: pending_cards.id });

  if (!pending) throw new Error('Failed to insert pending_card');

  try {
    // Sentence kind uses word prompt as placeholder at V0
    const fields = await extractWordFields(input_text);

    const [audio, images] = await Promise.all([
      synthesize(fields.lemma),
      searchImages(fields.image_search_query),
    ]);

    const hash = contentHash(fields.lemma);

    // Upsert audio_clip record — content-addressed, safe to call repeatedly
    await db
      .insert(audio_clips)
      .values({
        content_hash: hash,
        text: fields.lemma,
        provider: 'narakeet',
        voice_id: 'felipe',
        storage_url: audio.audioUrl,
        duration_ms: audio.durationMs,
      })
      .onConflictDoNothing();

    const draft = { fields, audio_hash: hash, images };

    await db
      .update(pending_cards)
      .set({ status: 'ready_for_review', draft_json: draft, updated_at: new Date() })
      .where(eq(pending_cards.id, pending.id));

    return c.json({
      pending_card_id: pending.id,
      draft: {
        fields,
        audio_url: `/audio/${hash}`,
        audio_duration_ms: audio.durationMs,
        images,
      },
    });
  } catch (err) {
    await db
      .update(pending_cards)
      .set({ status: 'discarded', updated_at: new Date() })
      .where(eq(pending_cards.id, pending.id));
    throw err;
  }
});
