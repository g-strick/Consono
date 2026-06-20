/**
 * detectKind.test.ts — Smoke tests for the v6 word/sentence detector.
 *
 * Written as plain node assertions (no Jest/Mocha globals) so this file
 * compiles cleanly and can be run with `node --loader ts-node/esm` before
 * a test runner is configured. When Jest is added, migrate to describe/it.
 *
 * Run: node -r ts-node/register src/lib/detectKind.test.ts
 */
import { detectKind } from './detectKind';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `FAIL [${label}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }

  console.log(`  PASS [${label}]`);
}

// ── Word cases ───────────────────────────────────────────────────────────────

assertEqual(detectKind('feijoada'), 'word', 'plain single word');
assertEqual(detectKind('  saudade '), 'word', 'single word with surrounding whitespace');
assertEqual(detectKind(''), 'word', 'empty string defaults to word');
assertEqual(detectKind('bem-vindo'), 'word', 'hyphenated compound counts as single token');
assertEqual(detectKind('Olá'), 'word', 'accented word without terminal punctuation');

// ── Sentence cases ───────────────────────────────────────────────────────────

assertEqual(detectKind('Que saudade de você!'), 'sentence', 'multiple-token phrase');
assertEqual(detectKind('Olá.'), 'sentence', 'single token + terminal period');
assertEqual(detectKind('Sim!'), 'sentence', 'single token + exclamation mark');
assertEqual(detectKind('Porquê?'), 'sentence', 'single token + question mark');
assertEqual(detectKind('Espera…'), 'sentence', 'single token + ellipsis character');
assertEqual(detectKind('bom dia'), 'sentence', 'two tokens no punctuation');
assertEqual(detectKind('  Eu como feijoada.  '), 'sentence', 'trimmed multi-token sentence');

console.log('\ndetectKind: all tests passed');
