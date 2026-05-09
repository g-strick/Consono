# 0005. Provider boundary architecture for swappable services

- Status: accepted
- Date: 2026-05-07

## Context

Four external service categories may need swapping: LLM (Claude/GPT),
TTS (Narakeet/ElevenLabs/Azure), image search (Google/Bing), audio
storage (S3/R2). Per ADR 0002, proprietary OK but no vendor lock-in.

Full DI ceremony for *every* dependency is over-engineering for solo.

## Decision

Interface boundaries only for the four categories. Each in
`apps/mobile/src/providers/{category}/`:

- An interface (`LLMProvider`, `TTSProvider`, `ImageSearchProvider`,
  `AudioStorageProvider`) defining capability we depend on
- Concrete implementations per active provider
- Provider factory or simple config selecting active implementation

Application code imports interface only. Tests use mocks.

For everything else, direct calls. New external service categories
require an ADR.

## Alternatives Considered

- **Full hexagonal architecture.** Maximum testability, massive
  ceremony. Rejected.
- **Direct API calls everywhere.** Lock-in becomes hard to escape.
  Rejected.
- **Defer until first swap.** We already know these will be swapped.
  Rejected.

## Consequences

### Positive
- TTS swappable (V2+ to open-source) with minimal app changes
- LLM swappable / upgradable without ripples
- Tests run without external dependencies
- Clear boundary for license auditing and cost tracking

### Negative
- One layer of indirection on every call to four services
- Discipline required: contributors and AI tools must use interface

### Neutral
- New service categories need ADR — prevents abstraction sprawl

## References
- ADR 0004 (TTS strategy)
- ADR 0003 (audio storage as provider)
- AGENTS.md "Provider boundaries"
