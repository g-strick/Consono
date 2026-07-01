---
plan: 03-04
status: complete
commit: b939b64
---

## What was built

App-wide DSGN-02 cobalt body-copy audit across all mobile screens (home, review, add, cards, streak). Found 4 violations and 1 non-violation; all violations fixed via the surface-aware tone system.

## Tasks completed

- **Task 1:** Grepped `color: colors.brand`, `color: colors.brandFill`, `color: '#1F3494'`, `color: '#2E5BC8'` across `apps/mobile/app/**` and `apps/mobile/src/components/**`. Classified every hit per D-02 (violation|allowed). Wrote `03-DSGN02-CHANGELOG.md` with file:line, element, classification, planned fix. Confirmed all 3 PATTERNS.md seeds.
- **Task 2:** Applied 4 fixes:
  - `add/index.tsx:506-513` — PipelineRow type: `color` made optional, `tone?: 'brand'` added
  - `add/index.tsx:521,528` — brand-colored pending pipeline rows use `tone: 'brand'` not `color: colors.brand`
  - `add/index.tsx:567,573` — Body/Mono render: `tone={row.tone}` + conditional style
  - `add/index.tsx:1093` — `<Body size={34} tone="brand">` (was `style={{ color: colors.brand }}`)
  - `cards/index.tsx:4` — Added `import { textColors } from '@/src/lib/theme'`
  - `cards/index.tsx:110` — `stateColor('new')` returns `textColors.light.brand` (was `'#1F3494'`)

## Acceptance criteria met

- `grep -rnE "color: '#1F3494'|color: colors\.brand" apps/mobile/app` → 0 text-color hits remaining ✓
- `add/index.tsx` no longer contains `<Body size={34} style={{ color: colors.brand }}>` ✓
- `03-DSGN02-CHANGELOG.md` has before→after for every fixed violation (D-03) ✓
- `tsc --noEmit` clean for all touched screens ✓
- streak/index.tsx post-rewrite: all cobalt via tone system — no violations introduced ✓
