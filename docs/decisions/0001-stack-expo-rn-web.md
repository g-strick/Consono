# 0001. Use Expo + React Native + RN Web for the application stack

- Status: accepted
- Date: 2026-05-07

## Context

The product targets mobile (primary review surface) and desktop browser
(advanced editing surface) with App Store distribution as a near-term
goal. Solo developer with React Native background and light coding
overall, leaning heavily on AI-assisted tooling. Polish on mobile
matters because mobile is the daily-review device.

## Decision

Use Expo (managed workflow) with React Native for mobile and React
Native Web for the browser surface. Single codebase. EAS Build for
App Store and Play Store distribution at V2.

## Alternatives Considered

- **Capacitor + React.** Better desktop ergonomics, simpler cross-
  platform model. Mobile feel materially behind real native components.
  Rejected because mobile is the primary surface.
- **Native SwiftUI iOS + separate React/Next.js web.** Best mobile
  feel but ~1.7x build effort. Solo capacity doesn't support it.
  Rejected.
- **Plain PWA, no native shell.** No App Store path. Rejected.

## Consequences

### Positive
- Single codebase for iOS, Android, web from V0
- React Native background applies directly
- EAS Build removes native-build infrastructure work
- Excellent AI tooling support for React/RN

### Negative
- RN Web on desktop is functional but second-class
- Mobile feel ~95% of native, not 100%
- Locked into the RN ecosystem for the iOS app's lifetime

### Neutral
- Expo managed workflow until/unless a native module isn't in Expo's
  catalog. Bare workflow is the escape hatch.

## References
- ADR 0003 (cloud-first sync)
- ADR 0005 (provider boundary architecture)
