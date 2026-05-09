# apps/mobile

Expo + React Native + React Native Web app.

This directory will be initialized via `pnpm create expo` (or
equivalent) during the V0 toolchain setup milestone. See
`docs/specs/v0.md` and ADR 0001.

## Expected structure (post-init)

```text
apps/mobile/
├── app/                # Expo Router file-based routes
├── src/
│   ├── features/       # cards, srs, card-generation, audio, sync, etc.
│   ├── domain/         # core types, no UI, no I/O
│   ├── lib/            # pure utilities (FSRS, validation, Result)
│   ├── providers/      # tts, llm, image-search, audio-storage
│   ├── ui/             # cross-feature primitives only
│   └── env.ts          # Zod-validated process.env
├── tests/
│   ├── unit/           # mirrors src/ structure
│   ├── flows/          # smoke tests for critical paths
│   └── fixtures/
├── package.json
├── app.json            # Expo config
├── tsconfig.json
└── .env.example
```

See AGENTS.md for code conventions before adding files.
