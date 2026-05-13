import { synthesize } from '../apps/mobile/src/providers/tts.js';
import { searchImages } from '../apps/mobile/src/providers/image-search.js';
import { extractWordFields } from '../apps/mobile/src/providers/llm.js';

const word = process.argv[2];
if (!word) {
  console.error('Usage: npx tsx --env-file .env scripts/generate-card.ts <word>');
  process.exit(1);
}

void (async () => {
  const fields = await extractWordFields(word);

  const [audio, images] = await Promise.all([
    synthesize(fields.lemma),
    searchImages(fields.image_search_query),
  ]);

  console.log(JSON.stringify({ fields, audio, images }, null, 2));
})();
