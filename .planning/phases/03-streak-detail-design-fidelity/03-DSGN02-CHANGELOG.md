# DSGN-02 Cobalt Audit Changelog

**Phase:** 03-streak-detail-design-fidelity  
**Task:** 03-04  
**Date:** 2026-06-24  
**Rule (D-02):** cobalt (#1F3494 / colors.brand) is permitted only on Num, Action,
`Body tone="brand"` key-action, active toggle states, and UI-SPEC Color whitelist
call sites. All other body cobalt-on-light is a violation. Background/border cobalt
is not audited here (text color only).

---

## Inventory

| file:line           | element                                                                                           | classification | planned fix                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| add/index.tsx:521   | `{ color: colors.brand }` in wordPipelineRows — body label + mono value                           | **violation**  | use `tone: 'brand'` on PipelineRow; render Body/Mono with `tone` prop |
| add/index.tsx:528   | `{ color: colors.brand }` in sentencePipelineRows — same                                          | **violation**  | same as above                                                         |
| add/index.tsx:1093  | `<Body size={34} style={{ color: colors.brand }}>✓</Body>`                                        | **violation**  | `<Body size={34} tone="brand">` — remove inline style                 |
| cards/index.tsx:82  | `backgroundColor: genderColor` where genderColor='#1F3494' for masculine                          | **allowed**    | background, not text — no change                                      |
| cards/index.tsx:110 | `stateColor('new') = '#1F3494'` → used as text color at line 101                                  | **violation**  | import `textColors`, return `textColors.light.brand`                  |
| streak/index.tsx    | All cobalt uses (tone="brand" on Body/Mono, Num default, nav icons, axis last tick, today border) | **allowed**    | all via tone system or whitelisted call sites                         |
| review/index.tsx    | No cobalt text hits                                                                               | **allowed**    | n/a                                                                   |
| (tabs)/index.tsx    | No cobalt text hits                                                                               | **allowed**    | n/a                                                                   |

**PATTERNS.md seeds confirmed:** add/index.tsx:1093 ✓ · cards/index.tsx:82 (background — allowed) ✓ · cards/index.tsx:110 ✓

---

## Before → After

### add/index.tsx:521,528 — PipelineRow brand color

**Before (521):** `{ label: '○ images', value: '0 / 4', color: colors.brand, mono: true }`  
**After (521):** `{ label: '○ images', value: '0 / 4', tone: 'brand' as const, mono: true }`

**Before (528):** `{ label: '○ images', value: '0 / 4', color: colors.brand, mono: true }`  
**After (528):** `{ label: '○ images', value: '0 / 4', tone: 'brand' as const, mono: true }`

PipelineRow type: added `tone?: 'brand'`. Render: `<Body tone={row.tone} style={row.tone ? undefined : { color: row.color }}>` and same for `<Mono>`.

### add/index.tsx:1093 — ✓ success icon

**Before:** `<Body size={34} style={{ color: colors.brand }}>✓</Body>`  
**After:** `<Body size={34} tone="brand">✓</Body>`

### cards/index.tsx:110 — stateColor 'new'

**Before:** `if (state === 'new') return '#1F3494';`  
**After:** `if (state === 'new') return textColors.light.brand;` (import textColors from theme)
