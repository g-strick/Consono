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
