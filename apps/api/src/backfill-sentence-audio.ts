/**
 * One-shot backfill: synthesize sentence audio for cards that have sentence_pt
 * but no sentence_audio_clip_hash. Run once after Plan 1.2.
 *
 * Usage: tsx --env-file ../../.env src/backfill-sentence-audio.ts
 */
import { db, cards, audio_clips } from '@portuguese-app/db';
import { isNull, isNotNull, and, eq } from 'drizzle-orm';
import { synthesize } from '../../mobile/src/providers/tts.js';
import { contentHash } from './lib/audio.js';

async function main() {
  const missing = await db.query.cards.findMany({
    where: and(isNotNull(cards.sentence_pt), isNull(cards.sentence_audio_clip_hash)),
    columns: { id: true, sentence_pt: true },
  });

  if (missing.length === 0) {
    console.log('No cards need backfill.');
    return;
  }

  console.log(`Backfilling sentence audio for ${missing.length} card(s)...`);

  for (const card of missing) {
    const sentence = card.sentence_pt!;
    console.log(`  Card ${card.id}: "${sentence.slice(0, 60)}"`);
    try {
      const result = await synthesize(sentence);
      const hash = contentHash(sentence);

      await db
        .insert(audio_clips)
        .values({
          content_hash: hash,
          text: sentence,
          provider: 'narakeet',
          voice_id: 'felipe',
          storage_url: result.audioUrl,
          duration_ms: result.durationMs,
        })
        .onConflictDoNothing();

      await db.update(cards).set({ sentence_audio_clip_hash: hash }).where(eq(cards.id, card.id));

      console.log(`    ✓ ${hash.slice(0, 16)}...`);
    } catch (err) {
      console.error(`    ✗ failed: ${err}`);
    }
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
