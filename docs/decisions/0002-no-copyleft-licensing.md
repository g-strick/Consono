# 0002. Permissive licensing only; no copyleft

- Status: accepted
- Date: 2026-05-07

## Context

This is intended to be a paid app eventually. Copyleft licenses (GPL,
AGPL, LGPL, CC-BY-SA) impose obligations conflicting with that goal —
source disclosure, derivative-work licensing, attribution patterns
incompatible with commercial distribution. Open-source-first remains
preferred but "open source" ≠ "permissive."

## Decision

All dependencies and structured data must be:
1. Permissively licensed (MIT, Apache 2.0, BSD, CC-BY, public domain), or
2. Commercial/proprietary with clear terms, or
3. Self-owned (curated by us).

Excluded: GPL, AGPL, LGPL, CC-BY-SA, all other copyleft.

Proprietary services acceptable where they materially outperform open
alternatives, but must be swappable.

## Alternatives Considered

- **Open-source-first including copyleft.** Cheaper, broader. Conflicts
  with paid-app future. Rejected.
- **Proprietary-friendly, no preference.** More options, vendor lock-in
  is real. Rejected.

## Consequences

### Positive
- No future legal entanglement
- Clear gate for new dependencies
- Forces "swappable" architecture for proprietary services

### Negative
- Excludes some quality tools (eSpeak NG GPLv3, HermitDave frequency
  lists CC-BY-SA, Wiktionary CC-BY-SA)
- More custom data ingestion required (Leipzig CC-BY for frequency)
- License-auditing overhead on new dependencies

### Neutral
- LGPL gray area, treated as excluded by default

## References
- ADR 0004 (TTS provider strategy)
- ADR 0005 (provider boundaries)
