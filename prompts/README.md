# Prompts

Versioned AI prompts. Per AGENTS.md "AI usage" rules:

- Every LLM output is validated through a Zod schema before use.
- Prompts live here as files, not as inline strings.

## File convention

Each prompt is a TypeScript file exporting a `PromptDefinition`:

```ts
export type PromptDefinition<TInput, TOutput> = {
  /** Stable identifier. Used in logs, eval harnesses. */
  id: string;

  /** Semver-style version. Bump when prompt content changes meaningfully. */
  version: string;

  /** What this prompt does, one sentence. */
  purpose: string;

  /** Pinned model and parameters. */
  model: {
    provider: 'anthropic' | 'openai';
    model: string;
    temperature: number;
    maxTokens: number;
  };

  /** Input shape, validated before sending. */
  inputSchema: z.ZodType<TInput>;

  /** Output shape, validated after parsing. */
  outputSchema: z.ZodType<TOutput>;

  /** Build messages from input. Pure function. */
  buildMessages: (input: TInput) => Message[];

  /** Optional notes — known limitations, evaluation criteria. */
  notes?: string;
};
```

## Folder structure

```text
prompts/
├── card-generation/
│   ├── extract-lemma-from-word.ts       # word → lemma + metadata
│   ├── generate-sentence-candidates.ts  # 4 i+1 sentences
│   ├── generate-card-fields.ts          # IPA, image query, etc.
│   └── analyze-sentence-input.ts        # for sentence cards
├── _shared/
│   └── output-instructions.ts           # JSON-only response patterns
└── README.md
```

## Rules

1. **Models pinned, not "latest".** `claude-sonnet-4-5-20250929`,
   not `claude-sonnet-latest`.
2. **Input validated before sending** via `inputSchema`.
3. **Output validated after parsing** via `outputSchema`.
4. **Prompt version bumped** when the prompt content meaningfully
   changes. Not for typo fixes; yes for changing instructions.
5. **Eval before bumping major version.** Run `make validate-prompts`
   to check schema coverage; manual eyeballing for content quality.
