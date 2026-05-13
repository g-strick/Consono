import { z } from 'zod';

export const WordFieldsInputSchema = z.object({
  word: z.string(),
});

export const WordFieldsOutputSchema = z.object({
  lemma: z.string(),
  gender: z.enum(['masculine', 'feminine', 'common']),
  gendered_form: z.string(),
  stress_marker: z.string(),
  usage_context: z.string(),
  register_tag: z.enum(['formal', 'neutral', 'informal', 'slang', 'vulgar']),
  sounds_like: z.string().nullable(),
  image_search_query: z.string(),
  sentence_candidates: z.array(z.string()).length(4),
});

export type WordFieldsInput = z.infer<typeof WordFieldsInputSchema>;
export type WordFieldsOutput = z.infer<typeof WordFieldsOutputSchema>;

export const extractWordFieldsPrompt = {
  id: 'extract-word-fields',
  version: '1.0.0',
  purpose: 'Extract card metadata and 4 i+1 sentence candidates from a Brazilian Portuguese word.',

  buildSystemPrompt(): string {
    return `You are a Brazilian Portuguese language expert building flashcard data.
Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.

JSON schema:
{
  "lemma": string,           // canonical dictionary form
  "gender": "masculine" | "feminine" | "common",
  "gendered_form": string,   // e.g. "a feijoada", "o livro"
  "stress_marker": string,   // e.g. "fei.JO.a.da"
  "usage_context": string,   // 1–3 short contexts, e.g. "restaurante, almoço"
  "register_tag": "formal" | "neutral" | "informal" | "slang" | "vulgar",
  "sounds_like": string | null, // English cognate/memory hook, or null
  "image_search_query": string, // English phrase for image search
  "sentence_candidates": [string, string, string, string] // exactly 4 i+1 sentences in Brazilian Portuguese
}

Rules for sentence_candidates:
- Each sentence uses only common vocabulary PLUS the target word
- Natural Brazilian Portuguese (você, 3rd-person singular)
- Varied contexts
- Exactly 4 sentences`;
  },

  buildUserPrompt(input: WordFieldsInput): string {
    return `Word: ${input.word}`;
  },
};
