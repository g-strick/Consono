const BASE = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000';

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

export interface GenerateDraft {
  pending_card_id: number;
  draft: {
    fields: {
      lemma: string;
      gender: 'masculine' | 'feminine' | 'common';
      gendered_form: string;
      stress_marker: string;
      usage_context: string;
      register_tag: 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar';
      sounds_like: string | null;
      sentence_candidates: [string, string, string, string];
    };
    audio_url: string;
    audio_duration_ms: number;
    images: ImageResult[];
  };
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

export const api = {
  generate(input_text: string, kind: CardKind) {
    return request<GenerateDraft>('/generate', {
      method: 'POST',
      body: JSON.stringify({ input_text, kind }),
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
    return request<{ cards: DueCard[] }>('/cards/due');
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
