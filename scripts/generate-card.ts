import { synthesize } from '../apps/mobile/src/providers/tts.js';
import { searchImages } from '../apps/mobile/src/providers/image-search.js';

const word = process.argv[2];
if (!word) {
  console.error('Usage: npx tsx --env-file .env scripts/generate-card.ts <word>');
  process.exit(1);
}

void (async () => {
  const [audio, images] = await Promise.all([synthesize(word), searchImages(word)]);

  console.log(JSON.stringify({ word, audio, images }, null, 2));
})();
