import { Hono } from 'hono';
import { createReadStream, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { Readable } from 'stream';

export const audioRoute = new Hono();

const AUDIO_CACHE_DIR = resolve(process.cwd(), 'audio-cache');

/** GET /audio/:hash — serves local MP3 until Supabase Storage is wired (ADR 0007) */
audioRoute.get('/:hash', (c) => {
  const hash = c.req.param('hash');

  // Reject anything that isn't a 64-char hex string (prevent path traversal)
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    return c.json({ error: 'invalid hash' }, 400);
  }

  const filePath = resolve(AUDIO_CACHE_DIR, `${hash}.mp3`);

  if (!existsSync(filePath)) {
    return c.json({ error: 'audio not found' }, 404);
  }

  const { size } = statSync(filePath);
  const stream = createReadStream(filePath);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});
