import { describe, it, expect } from 'vitest';
import { filterCards, formatDueAt, formatLastReviewed } from './cardUtils';
import type { ActiveFilters } from './cardUtils';
import type { AllCard } from './api';

function makeCard(overrides: Partial<AllCard> = {}): AllCard {
  return {
    id: 1,
    card_kind: 'word',
    headword: 'casa',
    gendered_form: 'a casa',
    gender: 'feminine',
    stress_marker: 'CA-sa',
    usage_context: 'home',
    register_tag: 'neutral',
    sounds_like: null,
    image_url: null,
    sentence_pt: 'A casa é bonita.',
    audio_url: null,
    sentence_audio_url: null,
    state: 'new',
    due_at: new Date().toISOString(),
    source_tag: null,
    stability: null,
    difficulty: null,
    reps: 0,
    lapses: 0,
    last_reviewed_at: null,
    created_at: new Date().toISOString(),
    suspended_at: null,
    ...overrides,
  };
}

const emptyFilters: ActiveFilters = { gender: [], source_tag: [], register: [], srs_state: [] };

// ─── filterCards ──────────────────────────────────────────────────────────────

describe('filterCards', () => {
  it('returns all cards when no filters are active', () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })];
    expect(filterCards(cards, emptyFilters)).toHaveLength(2);
  });

  it('filters by gender — returns only matching-gender cards', () => {
    const cards = [
      makeCard({ id: 1, gender: 'feminine' }),
      makeCard({ id: 2, gender: 'masculine' }),
      makeCard({ id: 3, gender: 'feminine' }),
    ];
    const result = filterCards(cards, { ...emptyFilters, gender: ['feminine'] });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.gender === 'feminine')).toBe(true);
  });

  it('applies AND logic across gender and register dimensions', () => {
    const cards = [
      makeCard({ id: 1, gender: 'feminine', register_tag: 'formal' }),
      makeCard({ id: 2, gender: 'feminine', register_tag: 'informal' }),
      makeCard({ id: 3, gender: 'masculine', register_tag: 'formal' }),
    ];
    const result = filterCards(cards, {
      ...emptyFilters,
      gender: ['feminine'],
      register: ['formal'],
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(1);
  });

  it('srs_state includes "suspended" — returns only cards where suspended_at != null', () => {
    const cards = [
      makeCard({ id: 1, suspended_at: null }),
      makeCard({ id: 2, suspended_at: '2026-01-01T00:00:00.000Z' }),
      makeCard({ id: 3, suspended_at: '2026-01-02T00:00:00.000Z' }),
    ];
    const result = filterCards(cards, { ...emptyFilters, srs_state: ['suspended'] });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.suspended_at != null)).toBe(true);
  });

  it('srs_state "review" — excludes suspended cards even if their state is "review"', () => {
    const cards = [
      makeCard({ id: 1, state: 'review', suspended_at: null }),
      makeCard({ id: 2, state: 'review', suspended_at: '2026-01-01T00:00:00.000Z' }),
    ];
    const result = filterCards(cards, { ...emptyFilters, srs_state: ['review'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(1);
  });
});

// ─── formatDueAt ─────────────────────────────────────────────────────────────

describe('formatDueAt', () => {
  it('returns "Today" for a past ISO date', () => {
    const yesterday = new Date(Date.now() - 86400_000).toISOString();
    expect(formatDueAt(yesterday)).toBe('Today');
  });

  it('returns "Today" for a current timestamp', () => {
    expect(formatDueAt(new Date().toISOString())).toBe('Today');
  });

  it('returns "Tomorrow" for tomorrow', () => {
    const tomorrow = new Date(Date.now() + 86400_000).toISOString();
    expect(formatDueAt(tomorrow)).toBe('Tomorrow');
  });

  it('returns short date for further future dates', () => {
    const future = new Date(Date.now() + 4 * 86400_000).toISOString();
    const result = formatDueAt(future);
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Tomorrow');
    expect(result).toMatch(/^[A-Z][a-z]+ \d+$/);
  });
});

// ─── formatLastReviewed ───────────────────────────────────────────────────────

describe('formatLastReviewed', () => {
  it('returns "Never" for null', () => {
    expect(formatLastReviewed(null)).toBe('Never');
  });

  it('returns "Today" for a timestamp earlier today', () => {
    const earlier = new Date();
    earlier.setHours(0, 0, 0, 0);
    expect(formatLastReviewed(earlier.toISOString())).toBe('Today');
  });

  it('returns "Yesterday" for 1 day ago', () => {
    const yesterday = new Date(Date.now() - 86400_000).toISOString();
    expect(formatLastReviewed(yesterday)).toBe('Yesterday');
  });

  it('returns "N days ago" for more than 1 day ago', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400_000).toISOString();
    expect(formatLastReviewed(fiveDaysAgo)).toBe('5 days ago');
  });
});
