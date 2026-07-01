import { Hono } from 'hono';
import { z } from 'zod';
import { db, pending_cards } from '@portuguese-app/db';
import { eq } from 'drizzle-orm';
import { extractWordFields, WordFieldsOutput } from '../../../mobile/src/providers/llm.js';
import { searchImages } from '../../../mobile/src/providers/image-search.js';
import { V0_USER_ID } from '../lib/constants.js';

export const generateRoute = new Hono();

const FieldsInput = z.object({
  input_text: z.string().min(1),
  kind: z.enum(['word', 'sentence']),
});

const ImagesInput = z.object({
  pending_card_id: z.number().int(),
  image_search_query: z.string().min(1),
});

generateRoute.post('/fields', async (c) => {
  const body = await c.req.json();
  const parsed = FieldsInput.safeParse(body);
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

    await db
      .update(pending_cards)
      .set({ draft_json: { fields }, updated_at: new Date() })
      .where(eq(pending_cards.id, pending.id));

    return c.json({
      pending_card_id: pending.id,
      fields,
    });
  } catch (err) {
    await db
      .update(pending_cards)
      .set({ status: 'discarded', updated_at: new Date() })
      .where(eq(pending_cards.id, pending.id));
    throw err;
  }
});

generateRoute.post('/images', async (c) => {
  const body = await c.req.json();
  const parsed = ImagesInput.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const { pending_card_id, image_search_query } = parsed.data;

  // Read the current pending_card to get existing fields and check status
  const [existing] = await db
    .select()
    .from(pending_cards)
    .where(eq(pending_cards.id, pending_card_id));

  if (!existing) return c.json({ error: 'pending_card not found' }, 404);

  // Only block terminal states — allow 'generating' and 'ready_for_review' so "↻ more" works
  if (existing.status === 'discarded') {
    return c.json({ error: 'pending_card is discarded and cannot be updated' }, 409);
  }

  const images = await searchImages(image_search_query);

  // Merge images into existing draft_json (preserving fields from /fields call)
  const existingDraft = (existing.draft_json as { fields?: WordFieldsOutput } | null) ?? {};
  const draft = { ...existingDraft, images };

  await db
    .update(pending_cards)
    .set({ status: 'ready_for_review', draft_json: draft, updated_at: new Date() })
    .where(eq(pending_cards.id, pending_card_id));

  return c.json({ images });
});
