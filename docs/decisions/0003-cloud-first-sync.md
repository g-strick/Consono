# 0003. Cloud-first architecture with offline cache

- Status: accepted
- Date: 2026-05-07

## Context

Multiple clients from V0 (mobile + web). Must show consistent state.
At V2, native iOS and Android shells via EAS. Audio assets are large
and expensive to generate.

Local-first sync conflict resolution is a category of complexity not
justified by V0/V1 needs. Cloud-first is simpler for a learning app.

## Decision

Cloud is source of truth. All durable state and audio binary content
in cloud. Clients hold caches (SQLite mobile, IndexedDB web), populated
on demand.

Writes optimistic: local update + queued cloud write + reconciliation
on response. Offline review fully functional from cache; writes queue
while offline, sync on reconnect.

Conflicts: last-write-wins at V0; revisit at V2 if multi-device write
collisions become real.

Audio: content-addressed by SHA-256(text + provider + voice). Identical
audio generated exactly once across all users.

## Alternatives Considered

- **Local-first with CRDT sync.** Best offline experience. Implementation
  complexity too high for solo + light coding. Rejected.
- **Cloud-only, no offline.** Subway review must work. Rejected.
- **Hybrid: cloud for content, local for review state.** Adds
  complexity without clear benefit. Rejected.

## Consequences

### Positive

- Multi-client consistency straightforward
- Cross-user audio dedup (significant cost savings)
- New clients (V2 native shells) get same data with no extra work
- Centralized backups and analytics

### Negative

- Network needed for first-time use of new content
- Sync queue / conflict resolution requires care
- Hosting costs from V0
- Serverless-friendly DB choice constrains some patterns

### Neutral

- Last-write-wins fine at V0 (single user); will need revisiting if
  multi-device write collisions become real

## References

- ADR 0001 (Expo + RN + RN Web)
