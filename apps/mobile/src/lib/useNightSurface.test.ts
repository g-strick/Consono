/**
 * useNightSurface.test.ts — Unit tests for the DSGN-01 OLED night-trigger predicate.
 *
 * Uses vitest describe/it/expect. No @types/jest needed.
 * Run: corepack pnpm exec vitest run apps/mobile/src/lib/useNightSurface.test.ts
 *
 * DSGN-01 truth table:
 *   system dark mode AND hour in [19, 24) OR [0, 6) → 'oled'
 *   otherwise → 'light'
 *
 * Tests are scoped to the pure predicate isOledSurface(colorScheme, hour).
 * The hook useNightSurface() is verified by inspection: it delegates to
 * isOledSurface(useColorScheme(), new Date().getHours()).
 */
import { vi, describe, it, expect } from 'vitest';

// Mock react-native before importing useNightSurface so the module loads in node/vitest.
vi.mock('react-native', () => ({ useColorScheme: () => null }));

import { isOledSurface } from './useNightSurface';

// ─── isOledSurface — DSGN-01 truth table ──────────────────────────────────────

describe('isOledSurface', () => {
  // Night + dark mode → oled

  it('returns true at hour 19 (night start boundary) in dark mode', () => {
    expect(isOledSurface('dark', 19)).toBe(true);
  });

  it('returns true at hour 23 (deep night) in dark mode', () => {
    expect(isOledSurface('dark', 23)).toBe(true);
  });

  it('returns true at hour 0 (midnight) in dark mode', () => {
    expect(isOledSurface('dark', 0)).toBe(true);
  });

  it('returns true at hour 5 (night end boundary) in dark mode', () => {
    expect(isOledSurface('dark', 5)).toBe(true);
  });

  // Daytime + dark mode → light (not night hours)

  it('returns false at hour 6 (day start — just past night window) in dark mode', () => {
    expect(isOledSurface('dark', 6)).toBe(false);
  });

  it('returns false at hour 12 (noon) in dark mode', () => {
    expect(isOledSurface('dark', 12)).toBe(false);
  });

  it('returns false at hour 18 (evening, before night window) in dark mode', () => {
    expect(isOledSurface('dark', 18)).toBe(false);
  });

  // Light mode at night → light (light mode ignores night trigger)

  it('returns false at hour 23 in light mode (DSGN-01: light mode never oled)', () => {
    expect(isOledSurface('light', 23)).toBe(false);
  });

  // Null / undefined scheme → light

  it('returns false at hour 23 when colorScheme is null', () => {
    expect(isOledSurface(null, 23)).toBe(false);
  });

  it('returns false at hour 23 when colorScheme is undefined', () => {
    expect(isOledSurface(undefined, 23)).toBe(false);
  });
});
