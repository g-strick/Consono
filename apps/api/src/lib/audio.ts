import { createHash } from 'crypto';

/** Must match tts.ts contentHash — same formula, same defaults. */
export function contentHash(text: string, provider = 'narakeet', voiceId = 'felipe'): string {
  return createHash('sha256').update(`${text}${provider}${voiceId}`).digest('hex');
}
