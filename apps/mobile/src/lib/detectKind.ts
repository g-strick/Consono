/**
 * detectKind — v6 type detector.
 *
 * Contract (from wireframes/Wireframes v6.html §A detector contract):
 *   - Empty text → 'word'  (defaults to word path)
 *   - ≤1 token AND no terminal punctuation → 'word'
 *   - More than 1 token OR terminal punctuation on single token → 'sentence'
 *
 * Terminal punctuation: . ! ? …
 * Hyphen is NOT a token separator (e.g. 'bem-vindo' is a word).
 * Pure function — no side effects, no network, no React.
 *
 * @param text - Raw input from the Add field (may be untrimmed).
 * @returns 'word' | 'sentence'
 *
 * @example
 *   detectKind('feijoada')         → 'word'
 *   detectKind('  saudade ')       → 'word'
 *   detectKind('')                 → 'word'
 *   detectKind('Que saudade!')     → 'sentence'
 *   detectKind('Olá.')             → 'sentence'
 *   detectKind('bem-vindo')        → 'word'
 */
import { CardKind } from '@/src/lib/api';

/** Characters that mark a word as sentence-like terminal punctuation. */
const TERMINAL_PUNCTUATION = /[.!?…]$/;

export function detectKind(text: string): CardKind {
  const trimmed = text.trim();

  // Empty → word path
  if (trimmed.length === 0) return 'word';

  // Split on whitespace and filter out empty strings
  const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0);

  // Multiple tokens → sentence
  if (tokens.length > 1) return 'sentence';

  // Single token but ends with terminal punctuation → sentence
  if (TERMINAL_PUNCTUATION.test(trimmed)) return 'sentence';

  // Single token, no terminal punctuation → word
  return 'word';
}
