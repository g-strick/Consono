import {
  extractWordFieldsPrompt,
  WordFieldsOutput,
  WordFieldsOutputSchema,
} from '../../../../prompts/card-generation/extract-word-fields.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/messages';
const MODEL = 'google/gemini-2.5-flash-lite';

function extractJson(raw: string): string {
  // Gemini sometimes wraps JSON in ```json ... ``` fences — strip them
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

export async function extractWordFields(word: string): Promise<WordFieldsOutput> {
  const apiKey = process.env['OPENROUTER_API_KEY'];
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      system: extractWordFieldsPrompt.buildSystemPrompt(),
      messages: [{ role: 'user', content: extractWordFieldsPrompt.buildUserPrompt({ word }) }],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const raw = body.content?.[0]?.text;
  if (!raw)
    throw new Error(`OpenRouter returned empty content. Full body: ${JSON.stringify(body)}`);

  const cleaned = extractJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`LLM returned non-JSON:\n${raw}`);
  }

  const result = WordFieldsOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `LLM output failed Zod validation:\n${JSON.stringify(result.error.issues, null, 2)}\n\nRaw:\n${raw}`,
    );
  }

  return result.data;
}
