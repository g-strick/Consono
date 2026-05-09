# Scripts

One-off utilities, kept forever. If you'd run something rarely but
might need to run it again, it lives here. Do not delete.

## Conventions

- TypeScript, executed via `pnpm exec tsx`.
- Each script has top-of-file comment explaining purpose, inputs, outputs.
- Scripts that mutate data have a `--dry-run` flag.
- Idempotent where possible (running twice produces the same result).

## Current scripts

- `ingest-frequency.ts` — Build frequency list from Leipzig Corpora.
  Outputs `data/frequency/pt-br-leipzig.csv`.
- `prewarm-audio-cache.ts` — Generate TTS for top-N words. Useful
  when starting fresh or after voice change.
- `validate-prompts.ts` — Check prompt files conform to
  `PromptDefinition` shape and Zod schemas validate.

## Running

```bash
make ingest-frequency
make prewarm-audio
make validate-prompts
```

Or directly:

```bash
pnpm exec tsx scripts/ingest-frequency.ts --dry-run
```
