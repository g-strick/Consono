import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const TTSResultSchema = z.object({
  audioUrl: z.string(),
  durationMs: z.number(),
});

export type TTSResult = z.infer<typeof TTSResultSchema>;

const PROVIDER = 'narakeet';
const VOICE_ID = 'felipe';
const AUDIO_CACHE_DIR = path.resolve(process.cwd(), 'audio-cache');

export function contentHash(text: string): string {
  return crypto.createHash('sha256').update(`${text}${PROVIDER}${VOICE_ID}`).digest('hex');
}

function estimateDurationMs(bytes: number): number {
  // Narakeet outputs 128kbps MP3 = 16000 bytes/sec
  return Math.round((bytes / 16000) * 1000);
}

export async function synthesize(text: string): Promise<TTSResult> {
  const apiKey = process.env['NARAKEET_API_KEY'];
  if (!apiKey) throw new Error('NARAKEET_API_KEY not set');

  const hash = contentHash(text);
  const filePath = path.join(AUDIO_CACHE_DIR, `${hash}.mp3`);

  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });

  if (fs.existsSync(filePath)) {
    const { size } = fs.statSync(filePath);
    return TTSResultSchema.parse({ audioUrl: filePath, durationMs: estimateDurationMs(size) });
  }

  const response = await fetch(`https://api.narakeet.com/text-to-speech/mp3?voice=${VOICE_ID}`, {
    method: 'POST',
    headers: {
      Accept: 'application/octet-stream',
      'Content-Type': 'text/plain',
      'x-api-key': apiKey,
    },
    body: text,
  });

  if (!response.ok) {
    throw new Error(`Narakeet ${response.status}: ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return TTSResultSchema.parse({
    audioUrl: filePath,
    durationMs: estimateDurationMs(buffer.length),
  });
}
