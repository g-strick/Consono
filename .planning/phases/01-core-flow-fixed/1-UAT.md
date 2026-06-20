---
status: complete
phase: 01-core-flow-fixed
source:
  [
    reconstructed from ROADMAP success criteria + commits b1206c9,
    8ab1657,
    fa89fef — SUMMARY files were cleared,
  ]
started: 2026-06-20T00:00:00Z
updated: 2026-06-20T00:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test

expected: Kill any running API/Expo process. Start the API (apps/api, port 3000) and the mobile app from scratch. Server boots without errors, and the app loads (Home renders, cards fetch) against a fresh start.
result: pass

### 2. Add Wizard Completes on Device (Plan 1.1)

expected: On a real iPhone, run the full Add-word wizard: input → loading → pick image → pick sentence → review → save. The tab bar does NOT overlap or block the "Next" button at any step — every step is fully reachable and the card saves successfully.
result: pass

### 3. Sentence Audio on Review Reveal (Plan 1.2 — CORE-04/05)

expected: Start a review session and reveal a card created since Plan 1.2. The example sentence's audio plays on reveal (and the front audio plays). Audio is the full sentence, generated at approval time.
result: pass

### 4. Word-only TTS Removed (Plan 1.2)

expected: Generating a new card no longer produces a word-only audio clip — only the finalized sentence gets audio (at approval). No isolated word audio is generated or played anywhere.
result: pass

### 5. Real User Name on Home (Plan 1.3 — HOME-05)

expected: Home screen greeting shows the real user name fetched from the /users/me endpoint — NOT the hardcoded placeholder "Léo".
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
