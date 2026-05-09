# 0004. TTS provider strategy: Narakeet at V0, swappable

- Status: accepted
- Date: 2026-05-07

## Context

Audio quality is non-negotiable (Principle #4). Open-source BR
Portuguese TTS (Coqui, Piper, XTTS) is meaningfully behind proprietary
options. For a paid app, "meaningfully behind" is a real risk. User
open to paying for proprietary tools where quality warrants, but
strongly opposed to vendor lock-in.

Narakeet evaluated and selected: BR Portuguese voice quality is solid;
pricing is pay-per-minute (top-up or metered subscription) with no
vendor lock-in; commercial license (paid plans) imposes no usage
restrictions on generated audio.

## Decision

V0 uses **Narakeet** as the sole TTS provider with one chosen voice.
Pay-per-minute commercial plan required for API access.

TTS access only through `tts` provider interface in
`apps/mobile/src/providers/tts/`. Concrete implementation
(`NarakeetAdapter`) is interchangeable. Future providers (ElevenLabs,
Azure, Coqui) plug into the same interface — adding one is a provider
swap, not an application change.

The Narakeet API is async/job-based (submit job, poll for completion).
The TTS provider interface is designed for this model: `submitJob(text,
voiceId) → jobId`, `pollJob(jobId) → Result<AudioBytes, TTSError>`.
Synchronous providers wrap their calls in the same shape.

Audio aggressively cached — see ADR 0003. Content hash includes
provider + voice_id, so multiple providers can coexist in the same
cache without collision (architecture supports future provider-
switching feature).

## Alternatives Considered

- **ElevenLabs.** High-quality voices, subscription pricing. Rejected
  for V0 because Narakeet's pay-per-minute model is more aligned with
  side-project budget; will be tested as a future provider option.
- **Azure Neural.** Solid quality, broad voice catalog. Considered as
  fallback. Deferred; not needed at V0.
- **Coqui/Piper (open source).** Quality gap too large for V0.
  Revisit at V2+.
- **Native recordings only.** Coverage too sparse for on-demand
  generation. Rejected.

## Consequences

### Positive
- Pay-per-minute pricing aligns with side-project economics
- Commercial license is clean (no usage restrictions on generated
  audio when source text is owned)
- Provider boundary keeps future swaps cheap
- Architecture ready for multi-provider A/B testing

### Negative
- Async job model adds slight complexity (polling) vs streaming
- Single voice at V0; users can't pick — deferred to a later version

### Neutral
- ElevenLabs / Azure / Coqui can each be added later as additional
  provider implementations behind the same interface

## References
- ADR 0002 (permissive licensing — proprietary acceptable, swappable)
- ADR 0003 (audio caching)
- ADR 0005 (provider boundaries)
- `docs/ideas.md` "TTS provider/voice switching UI" section
