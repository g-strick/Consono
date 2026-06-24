import Constants from 'expo-constants';

function resolveApiBase(): string {
  if (process.env['EXPO_PUBLIC_API_URL']) return process.env['EXPO_PUBLIC_API_URL'];
  // In dev, Expo's hostUri is the LAN IP of the dev machine (e.g. "192.168.1.5:8081").
  // Using it avoids the localhost-doesn't-work-on-device problem.
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:3000`;
    }
  }
  return 'http://localhost:3000';
}

const BASE = resolveApiBase();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export type CardKind = 'word' | 'sentence';
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface ImageResult {
  url: string;
  attribution: string;
}

/** Full set of AI-generated word fields, including image_search_query for re-fetch. */
export interface WordFields {
  lemma: string;
  gender: 'masculine' | 'feminine' | 'common';
  gendered_form: string;
  stress_marker: string;
  usage_context: string;
  register_tag: 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar';
  sounds_like: string | null;
  image_search_query: string;
  sentence_candidates: [string, string, string, string];
}

export interface GenerateDraft {
  pending_card_id: number;
  draft: {
    fields: WordFields;
    images: ImageResult[];
  };
}

export interface GenerateFieldsResult {
  pending_card_id: number;
  fields: WordFields;
}

export interface GenerateImagesResult {
  images: ImageResult[];
}

export interface DueCard {
  id: number;
  card_kind: 'word' | 'sentence';
  headword: string | null;
  gendered_form: string | null;
  gender: 'masculine' | 'feminine' | 'common' | null;
  stress_marker: string | null;
  usage_context: string | null;
  register_tag: string | null;
  sounds_like: string | null;
  image_url: string | null;
  sentence_pt: string | null;
  audio_url: string | null;
  sentence_audio_url: string | null;
  state: 'new' | 'learning' | 'review' | 'relearning';
  due_at: string;
}

export interface Me {
  id: string;
  name: string;
  audio_speed: number;
}

export interface RecentCard {
  id: number;
  headword: string | null;
  sentence_pt: string | null;
  gender: 'masculine' | 'feminine' | 'common' | null;
  state: 'new' | 'learning' | 'review' | 'relearning';
  created_at: string;
}

export interface HomeSummary {
  totalCards: number;
  streak: { count: number; active: boolean; reviewedToday: boolean };
  todayStats: { reviewed: number; again: number };
  nextDueAt: string | null;
  recentCards: RecentCard[];
}

/** Shared rating counts shape — used in month/year/lifetime periods. */
interface RatingCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

/**
 * Aggregated streak-detail payload from GET /streak/stats.
 *
 * retention fields are integer percentages (0–100), not fractions.
 * The route multiplies the lib's 0.0–1.0 fraction × 100 before emitting.
 *
 * longestDates is a preformatted 'mmm d – mmm d' string (e.g. "jan 4 – jan 21")
 * matching the UI-SPEC copy contract, or null when no runs exist in the period.
 */
export interface StreakStats {
  hero: {
    streak: number;
    longestAllTime: number;
    /** Integer 0–100 (True FSRS retention over all time). */
    retentionAllTime: number;
  };
  month: {
    longestStreak: number;
    /** 'mmm d – mmm d' or null. */
    longestDates: string | null;
    /** Integer 0–100 (True FSRS retention for this calendar month). */
    retention: number;
    totalReviews: number;
    daysActive: number;
    /** Calendar days in the current month (e.g. 30 or 31). */
    daysInMonth: number;
    /** 'YYYY-MM-DD' → review count; for MonthHeatmap. */
    perDay: Record<string, number>;
    /** 'YYYY-MM-DD' → heat level 0–3; for MonthHeatmap intensity. */
    heatLevels: Record<string, number>;
    ratingCounts: RatingCounts;
  };
  year: {
    longestStreak: number;
    /** 'mmm d – mmm d' or null. */
    longestDates: string | null;
    /** Integer 0–100 (True FSRS retention for trailing 53 weeks). */
    retention: number;
    totalReviews: number;
    daysActive: number;
    /** 'YYYY-MM-DD' → review count; ~371 daily cells for YearHeatmap (STRK-04 default view). */
    perDay: Record<string, number>;
    /** 'YYYY-MM-DD' → heat level 0–3; for YearHeatmap intensity. */
    heatLevels: Record<string, number>;
    /** 12 trailing months for the reviews bar chart. */
    perMonth: Array<{ label: string; count: number }>;
    ratingCounts: RatingCounts;
  };
  lifetime: {
    longestStreak: number;
    /** 'mmm d – mmm d' or null. */
    longestDates: string | null;
    /** Integer 0–100 (True FSRS retention for all time). */
    retention: number;
    totalReviews: number;
    daysActive: number;
    /** 'YYYY-MM-DD' of the very first review, or null if no reviews. */
    firstReviewDate: string | null;
    /** All months from first review to now; for LifetimeBars chart. */
    perMonth: Array<{ label: string; count: number }>;
    ratingCounts: RatingCounts;
  };
  /**
   * All-time personal best runs: top 5 + current (D-05/06).
   * rank is a number 1–5 for historical bests, or 'current' when the run is ongoing.
   * startDate/endDate are 'YYYY-MM-DD' day keys.
   */
  bests: Array<{
    rank: number | string;
    days: number;
    startDate: string;
    endDate: string;
    current: boolean;
  }>;
}

export const api = {
  getMe() {
    return request<Me>('/users/me');
  },

  getHomeSummary() {
    return request<HomeSummary>('/home/summary');
  },

  getStreakStats() {
    return request<StreakStats>('/streak/stats');
  },

  generate(input_text: string, kind: CardKind) {
    return request<GenerateDraft>('/generate', {
      method: 'POST',
      body: JSON.stringify({ input_text, kind }),
    });
  },

  generateFields(input_text: string, kind: CardKind) {
    return request<GenerateFieldsResult>('/generate/fields', {
      method: 'POST',
      body: JSON.stringify({ input_text, kind }),
    });
  },

  generateImages(pending_card_id: number, image_search_query: string) {
    return request<GenerateImagesResult>('/generate/images', {
      method: 'POST',
      body: JSON.stringify({ pending_card_id, image_search_query }),
    });
  },

  approveCard(body: {
    pending_card_id: number;
    selected_image_url: string;
    selected_image_attribution: string;
    selected_sentence: string;
    edits?: {
      stress_marker?: string;
      usage_context?: string;
      sounds_like?: string | null;
      sentence_gloss_en?: string;
    };
  }) {
    return request<{ card_id: number }>('/cards', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getDueCards() {
    return request<{ cards: DueCard[] }>('/cards/due').then(({ cards }) => ({
      cards: cards.map((c) => ({
        ...c,
        audio_url: c.audio_url ? `${BASE}${c.audio_url}` : null,
        sentence_audio_url: c.sentence_audio_url ? `${BASE}${c.sentence_audio_url}` : null,
      })),
    }));
  },

  submitReview(card_id: number, rating: Rating, duration_ms?: number) {
    return request<{ next_due_at: string }>('/reviews', {
      method: 'POST',
      body: JSON.stringify({ card_id, rating, duration_ms }),
    });
  },

  audioUrl(hash: string) {
    return `${BASE}/audio/${hash}`;
  },
};
