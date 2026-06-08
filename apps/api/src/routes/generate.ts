import { Hono } from 'hono';
import { z } from 'zod';
import { db, pending_cards } from '@portuguese-app/db';
import { eq } from 'drizzle-orm';
import { extractWordFields } from '../../../mobile/src/providers/llm.js';
import { searchImages } from '../../../mobile/src/providers/image-search.js';
import { V0_USER_ID } from '../lib/constants.js';

export const generateRoute = new Hono();

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
    const images = await searchImages(fields.image_search_query);
    const draft = { fields, images };

    await db
      .update(pending_cards)
      .set({ status: 'ready_for_review', draft_json: draft, updated_at: new Date() })
      .where(eq(pending_cards.id, pending.id));

    return c.json({
      pending_card_id: pending.id,
      draft: { fields, images },
    });
  } catch (err) {
    await db
      .update(pending_cards)
      .set({ status: 'discarded', updated_at: new Date() })
      .where(eq(pending_cards.id, pending.id));
    throw err;
  }
});
