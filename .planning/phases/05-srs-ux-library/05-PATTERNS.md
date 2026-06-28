# Phase 5: SRS UX + Library - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 9 new/modified files
**Analogs found:** 8 / 9

---

## File Classification

| New/Modified File                              | Role      | Data Flow        | Closest Analog                                                                           | Match Quality                                      |
| ---------------------------------------------- | --------- | ---------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `packages/db/src/schema.ts`                    | model     | CRUD             | `packages/db/src/schema.ts` (existing `cards` table)                                     | self — extend existing table                       |
| `packages/db/drizzle/0002_*.sql`               | migration | CRUD             | `packages/db/drizzle/0001_redundant_inertia.sql`                                         | exact                                              |
| `apps/api/src/routes/cards.ts`                 | route     | request-response | `apps/api/src/routes/cards.ts` (existing `/due` handler) + `apps/api/src/routes/home.ts` | self — extend + route-match                        |
| `apps/mobile/app/_layout.tsx`                  | config    | request-response | `apps/mobile/app/_layout.tsx` (existing Stack.Screen registrations)                      | self — extend                                      |
| `apps/mobile/app/(tabs)/cards/index.tsx`       | component | CRUD             | `apps/mobile/app/(tabs)/cards/index.tsx` (existing screen)                               | self — extend                                      |
| `apps/mobile/app/cards/[id].tsx`               | component | CRUD             | `apps/mobile/app/streak/index.tsx`                                                       | role-match (detail screen with query + stats grid) |
| `apps/mobile/src/lib/api.ts`                   | utility   | request-response | `apps/mobile/src/lib/api.ts` (existing `api` object methods)                             | self — extend                                      |
| `apps/mobile/src/components/SwipeableRow.tsx`  | component | event-driven     | **No analog** — zero swipe components in codebase                                        | none — use RESEARCH Pattern 3                      |
| `apps/api/src/lib/cardUtils.ts` (if extracted) | utility   | transform        | `apps/api/src/lib/homeSummary.ts`                                                        | role-match (pure functions, vitest-testable)       |

---

## Pattern Assignments

### `packages/db/src/schema.ts` (model, CRUD)

**Analog:** Self — extend existing `cards` table definition at lines 90-132.

**Imports pattern** (`schema.ts` lines 1-13):

```typescript
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
```

**Core extension — add one column after `last_reviewed_at` (line 128):**

```typescript
// packages/db/src/schema.ts — inside pgTable('cards', { ... })
// Place after last_reviewed_at (line 128), before created_at (line 130)
last_reviewed_at: timestamp('last_reviewed_at'),

suspended_at: timestamp('suspended_at'),  // null = active; timestamp = when suspended

created_at: timestamp('created_at').notNull().defaultNow(),
```

**Enum reference** (lines 17-29) — reuse existing enums for filter typing in mobile:

```typescript
export const genderEnum = pgEnum('gender', ['masculine', 'feminine', 'common']);
export const registerTagEnum = pgEnum('register_tag', [
  'formal',
  'neutral',
  'informal',
  'slang',
  'vulgar',
]);
export const cardStateEnum = pgEnum('card_state', ['new', 'learning', 'review', 'relearning']);
```

---

### `packages/db/drizzle/0002_*.sql` (migration, CRUD)

**Analog:** `packages/db/drizzle/0001_redundant_inertia.sql` — single-line ALTER TABLE.

**Full migration file** (copy structure exactly):

```sql
ALTER TABLE "cards" ADD COLUMN "suspended_at" timestamp;
```

**Generate + apply commands (from Makefile):**

```bash
make db-generate   # cd packages/db && corepack pnpm exec drizzle-kit generate
make db-migrate    # cd packages/db && corepack pnpm exec drizzle-kit migrate
```

---

### `apps/api/src/routes/cards.ts` (route, request-response)

**Analog (primary):** Self — existing `cardsRoute.post('/')` (lines 28-120) for Zod validation + Drizzle mutation structure; `cardsRoute.get('/due')` (lines 123-139) for query + map pattern.

**Analog (secondary):** `apps/api/src/routes/home.ts` — clean Hono route structure without side effects.

**Imports pattern** (`cards.ts` lines 1-8) — extend with new Drizzle operators:

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { db, pending_cards, lemmas, cards, audio_clips, reviews } from '@portuguese-app/db';
import { eq, and, isNull, desc } from 'drizzle-orm';
// Add: reviews import (needed for transactional delete)
import { V0_USER_ID } from '../lib/constants.js';
```

**Existing query + audioURL map pattern** (`cards.ts` lines 123-139) — copy for `GET /cards`:

```typescript
/** GET /cards/due — cards due for review today */
cardsRoute.get('/due', async (c) => {
  const due = await db.query.cards.findMany({
    where: (table, { and, eq, lte }) =>
      and(eq(table.user_id, V0_USER_ID), lte(table.due_at, new Date())),
    orderBy: (table, { asc }) => [asc(table.due_at)],
  });

  const result = due.map((card) => ({
    ...card,
    audio_url: card.audio_clip_hash ? `/audio/${card.audio_clip_hash}` : null,
    sentence_audio_url: card.sentence_audio_clip_hash
      ? `/audio/${card.sentence_audio_clip_hash}`
      : null,
  }));

  return c.json({ cards: result });
});
```

**New routes to add — registration order is critical (static `/due` before dynamic `/:id`):**

```typescript
// 1. GET /cards — all cards, newest-first (replaces getDueCards() in library)
// All cards including suspended — no isNull filter here; suspended badge is client-side.
// Only /due excludes suspended. Sort: desc(created_at) instead of asc(due_at).
cardsRoute.get('/', async (c) => {
  const allCards = await db.query.cards.findMany({
    where: (table, { eq }) => eq(table.user_id, V0_USER_ID),
    orderBy: (table, { desc }) => [desc(table.created_at)],
  });
  const result = allCards.map((card) => ({
    ...card,
    audio_url: card.audio_clip_hash ? `/audio/${card.audio_clip_hash}` : null,
    sentence_audio_url: card.sentence_audio_clip_hash
      ? `/audio/${card.sentence_audio_clip_hash}`
      : null,
  }));
  return c.json({ cards: result });
});

// 2. GET /cards/due — extend: add isNull(suspended_at) (D-07)
// BEFORE /:id — static route must precede parameterized route in Hono

// 3. GET /cards/:id — single card for detail screen
cardsRoute.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const card = await db.query.cards.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, id), eq(table.user_id, V0_USER_ID)),
  });
  if (!card) return c.json({ error: 'Not found' }, 404);
  return c.json({
    card: { ...card, audio_url: card.audio_clip_hash ? `/audio/${card.audio_clip_hash}` : null },
  });
});

// 4. PATCH /cards/:id — edit sentence_pt and/or source_tag
const PatchCardInput = z.object({
  sentence_pt: z.string().min(1).max(500).optional(),
  source_tag: z.string().nullable().optional(),
});
cardsRoute.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = PatchCardInput.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  // Mirror safeParse pattern from POST (cards.ts line 31)
});

// 5. PATCH /cards/:id/suspend — toggle suspended_at
const SuspendInput = z.object({ suspended: z.boolean() });
cardsRoute.patch('/:id/suspend', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  // set suspended_at = new Date() or null based on body.suspended
});

// 6. DELETE /cards/:id — transactional: reviews first, then card
cardsRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  // MUST delete reviews before card to avoid FK violation
  await db.delete(reviews).where(eq(reviews.card_id, id));
  await db.delete(cards).where(and(eq(cards.id, id), eq(cards.user_id, V0_USER_ID)));
  return c.json({ ok: true });
});
```

**Zod validation pattern** (`cards.ts` lines 11-31) — copy the safeParse + format error pattern:

```typescript
const parsed = ApproveInput.safeParse(body);
if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
```

---

### `apps/mobile/app/_layout.tsx` (config, request-response)

**Analog:** Self — existing `Stack.Screen` registrations at lines 59-65.

**Existing Stack.Screen pattern** (`_layout.tsx` lines 58-65):

```typescript
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen
    name="review/index"
    options={{ headerShown: false, presentation: 'fullScreenModal' }}
  />
  <Stack.Screen name="streak/index" options={{ title: 'Your streak' }} />
</Stack>
```

**Two changes required — add both inside the existing `<Stack>` block:**

```typescript
// 1. Add card detail screen registration (copy streak/index pattern)
<Stack.Screen name="cards/[id]" options={{ title: '' }} />

// 2. Wrap entire return with GestureHandlerRootView (outermost — outside QueryClientProvider)
import { GestureHandlerRootView } from 'react-native-gesture-handler';

return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ surface, setSurface }}>
        <Stack>
          {/* ... existing Stack.Screen entries ... */}
          <Stack.Screen name="cards/[id]" options={{ title: '' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeContext.Provider>
    </QueryClientProvider>
  </GestureHandlerRootView>
);
```

---

### `apps/mobile/app/(tabs)/cards/index.tsx` (component, CRUD)

**Analog:** Self — extend existing file entirely. Key patterns to preserve and extend.

**Existing imports + state pattern** (lines 1-29):

```typescript
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, DueCard } from '@/src/lib/api';
import { textColors } from '@/src/lib/theme';
import { useState } from 'react';
```

**Existing filter chip UI pattern** (lines 39-58) — copy for the expanded FilterChipBar:

```typescript
<View className="flex-row px-5 gap-2 mb-2">
  {FILTERS.map((f) => (
    <TouchableOpacity
      key={f}
      onPress={() => setFilter(f)}
      className="px-3 py-1.5 rounded-full border"
      style={{
        borderColor: filter === f ? '#1F3494' : '#E5E5E5',
        backgroundColor: filter === f ? '#1F3494' : 'transparent',
      }}
    >
      <Text
        className="text-xs font-medium capitalize"
        style={{ color: filter === f ? '#FFFFFF' : '#5A6995' }}
      >
        {f}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

**Existing CardRow + gender bar pattern** (lines 81-108) — extend with swipe wrapper + tap handler:

```typescript
function CardRow({ card }: { card: DueCard }) {
  const genderColor =
    card.gender === 'feminine' ? '#E8658A' : card.gender === 'masculine' ? '#1F3494' : '#F0BF38';

  return (
    <View className="border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3 bg-white">
      {card.gender && (
        <View style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: genderColor }} />
      )}
      <View className="flex-1">
        <Text className="text-content text-base font-semibold">
          {card.headword ?? card.sentence_pt}
        </Text>
        {card.gendered_form && (
          <Text className="text-muted text-xs mt-0.5">{card.gendered_form}</Text>
        )}
      </View>
      {/* state badge — reuse stateColor() helper */}
    </View>
  );
}
```

**Query key to replace** — change `['cards', 'due']` → `['cards', 'all']`, method `getDueCards()` → `getAllCards()`.

**Multi-dimensional filter type (replace existing `Filter` type)**:

```typescript
type RegisterTag = 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar';
type GenderValue = 'masculine' | 'feminine' | 'common';
type SrsStateFilter = 'new' | 'learning' | 'review' | 'relearning' | 'suspended';

type ActiveFilters = {
  gender: GenderValue[];
  source_tag: string[];
  register: RegisterTag[];
  srs_state: SrsStateFilter[];
};
```

---

### `apps/mobile/app/cards/[id].tsx` (component, CRUD)

**Analog:** `apps/mobile/app/streak/index.tsx` — detail screen with back nav, `useQuery`, `StatTile` grid, `ScrollView` + `StyleSheet`.

**Imports pattern** (`streak/index.tsx` lines 13-27) — adapt for card detail:

```typescript
import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '@/src/lib/theme';
import { Body, Mono, Num } from '@/src/components/Type';
import { StatTile } from '@/src/components/StatTile';
import { Card } from '@/src/components/Surface';
import { api } from '@/src/lib/api';
import type { AllCard } from '@/src/lib/api';
```

**Route param + query pattern** (`streak/index.tsx` lines 88-95 adapted for `[id].tsx`):

```typescript
export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = parseInt(id, 10);
  if (isNaN(cardId)) return null;  // guard malformed params

  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['cards', cardId],
    queryFn: () => api.getCard(cardId),
  });
  const card = data?.card;
```

**Back nav pattern** (`streak/index.tsx` lines 236-249):

```typescript
<View style={styles.nav}>
  <TouchableOpacity onPress={() => router.back()} style={styles.navBtn} hitSlop={8}>
    <Body surface="light" tone="brand" weight="medium" size={14}>←</Body>
  </TouchableOpacity>
  <Body surface="light" weight="semibold" size={14}>Card detail</Body>
  <View style={[styles.navBtn, styles.navBtnRight]} />
</View>
```

**StatTile grid pattern** (`streak/index.tsx` lines 303-315) — copy for SRS stats (D-05):

```typescript
<View style={styles.statGrid}>
  {stats.map((s) => (
    <StatTile
      key={s.label}
      value={s.value}
      label={s.label}
      sub={s.sub}
      style={styles.statTile}
    />
  ))}
</View>
// styles.statGrid = { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }
// styles.statTile = { width: '48.5%' }
```

**ScrollView + StyleSheet root pattern** (`streak/index.tsx` lines 228-235, 509-513):

```typescript
return (
  <SafeAreaView style={styles.root}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
// styles.root = { flex: 1, backgroundColor: colors.paper }
// styles.scrollContent = { paddingHorizontal: 20, paddingBottom: 32 }
```

**Inline edit TextInput pattern** (`add/index.tsx` lines 1156-1174) — copy for sentence edit:

```typescript
{editingSentence ? (
  <TextInput
    value={editDraft}
    onChangeText={setEditDraft}
    autoFocus
    autoCorrect={false}
    multiline
    style={{
      fontFamily: fonts.display,
      fontSize: 13,
      lineHeight: 20,
      flex: 1,
      marginTop: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.brand,
      borderStyle: 'dashed',
      color: '#000000',
    }}
  />
) : (
  <Body size={13} ...>{card?.sentence_pt}</Body>
)}
```

---

### `apps/mobile/src/lib/api.ts` (utility, request-response)

**Analog:** Self — extend the existing `api` object and add new interface definitions.

**Existing `request<T>` helper** (lines 19-29) — all new methods use this:

```typescript
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}
```

**Existing interface pattern** (`DueCard` at lines 69-85) — extend for `AllCard`:

```typescript
// Existing DueCard covers: id, card_kind, headword, gendered_form, gender,
// stress_marker, usage_context, register_tag, sounds_like, image_url,
// sentence_pt, audio_url, sentence_audio_url, state, due_at

// New interface — extends DueCard with Phase 5 fields:
export interface AllCard extends DueCard {
  source_tag: string | null;
  stability: number | null;
  difficulty: number | null;
  reps: number;
  lapses: number;
  last_reviewed_at: string | null;
  created_at: string;
  suspended_at: string | null;
}
```

**Existing method pattern** (`getDueCards` at lines 247-255) — copy for `getAllCards`:

```typescript
getDueCards() {
  return request<{ cards: DueCard[] }>('/cards/due').then(({ cards }) => ({
    cards: cards.map((c) => ({
      ...c,
      audio_url: c.audio_url ? `${BASE}${c.audio_url}` : null,
      sentence_audio_url: c.sentence_audio_url ? `${BASE}${c.sentence_audio_url}` : null,
    })),
  }));
},
```

**New methods to add** (mirror `getDueCards` + `approveCard` pattern):

```typescript
getAllCards() {
  return request<{ cards: AllCard[] }>('/cards').then(({ cards }) => ({
    cards: cards.map((c) => ({
      ...c,
      audio_url: c.audio_url ? `${BASE}${c.audio_url}` : null,
      sentence_audio_url: c.sentence_audio_url ? `${BASE}${c.sentence_audio_url}` : null,
    })),
  }));
},
getCard(id: number) {
  return request<{ card: AllCard }>(`/cards/${id}`);
},
updateCard(id: number, patch: { sentence_pt?: string; source_tag?: string | null }) {
  return request<{ card: AllCard }>(`/cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
},
suspendCard(id: number, suspend: boolean) {
  return request<void>(`/cards/${id}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ suspended: suspend }),
  });
},
deleteCard(id: number) {
  return request<void>(`/cards/${id}`, { method: 'DELETE' });
},
```

---

### `apps/mobile/src/components/SwipeableRow.tsx` (component, event-driven)

**No codebase analog.** Zero swipe components exist anywhere in the project. Use RESEARCH.md Pattern 3 directly.

Key points from RESEARCH:

- Import from `react-native-gesture-handler/ReanimatedSwipeable` (NOT package root — Pitfall 3)
- Props: `SwipeableMethods` from same import path; `SharedValue<number>` from `react-native-reanimated`
- `GestureHandlerRootView` must already be in `_layout.tsx` before this component will work

---

### `apps/api/src/lib/cardUtils.ts` (utility, transform) — if extracted

**Analog:** `apps/api/src/lib/homeSummary.ts` — pure functions, no DB imports, vitest-testable.

**File header pattern** (`homeSummary.ts` lines 1-9):

```typescript
/**
 * cardUtils.ts — Pure filter + stat formatting utilities.
 *
 * No DB imports, no Hono — pure functions so they are unit-testable with vitest.
 * Consumer: apps/api/src/routes/cards.ts (if filterCards is server-side)
 * OR: apps/mobile/app/(tabs)/cards/index.tsx (if client-side only)
 */
```

**Test file pattern** (`homeSummary.test.ts` lines 1-8) — copy for `cardUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { filterCards, formatDueAt, formatLastReviewed } from './cardUtils';
// Run: corepack pnpm exec vitest run apps/api/src/lib/cardUtils.test.ts
```

**Note:** RESEARCH places `filterCards` as client-side logic (mobile), but the test files for pure functions live at `apps/api/src/lib/`. The planner must decide where `cardUtils.ts` is sited. Either location uses the same vitest pattern.

---

## Shared Patterns

### Mutation + Cache Invalidation

**Source:** `apps/mobile/app/(tabs)/add/index.tsx` lines 146-162
**Apply to:** All mutation-bearing components — `cards/[id].tsx` (update, suspend, delete), `(tabs)/cards/index.tsx` (suspend, delete from swipe)

```typescript
// From add/index.tsx lines 38, 146-162
const queryClient = useQueryClient();

const approveMutation = useMutation({
  mutationFn: (sentence: string) => {
    // ... api call
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
    // Phase 5 mutations must ALSO invalidate:
    // queryClient.invalidateQueries({ queryKey: ['cards'] }); // clears 'all' + 'due' + per-card
    // queryClient.invalidateQueries({ queryKey: ['home', 'summary'] }); // totalCards stale after delete
  },
});
```

### TanStack Query Key Convention

**Source:** `apps/mobile/app/(tabs)/cards/index.tsx` line 24; `apps/mobile/app/(tabs)/add/index.tsx` line 160
**Apply to:** All new `useQuery` / `invalidateQueries` calls

| Key                   | Used For                |
| --------------------- | ----------------------- |
| `['cards', 'due']`    | Review queue (existing) |
| `['cards', 'all']`    | Library screen (new)    |
| `['cards', cardId]`   | Per-card detail (new)   |
| `['home', 'summary']` | Home screen total count |

Invalidate `['cards']` (without subkey) to clear ALL cards/\* entries at once.

### Delete with Confirmation Alert

**Source:** `apps/mobile/app/(tabs)/add/index.tsx` line 542 (`Alert.prompt`) — adapt to `Alert.alert` for delete
**Apply to:** `cards/[id].tsx` delete button, swipe Delete action in library

```typescript
// Alert.alert pattern for destructive confirmation (not Alert.prompt)
Alert.alert(
  'Delete card?',
  `This will permanently remove "${headword ?? 'this card'}" and its review history.`,
  [
    { text: 'Keep card', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
  ],
);
```

### Hono Route Validation Pattern

**Source:** `apps/api/src/routes/cards.ts` lines 11-32
**Apply to:** All new Hono route handlers (PATCH, DELETE)

```typescript
const parsed = SomeSchema.safeParse(body);
if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
```

Plus at every route with a numeric id param:

```typescript
const id = parseInt(c.req.param('id'), 10);
if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
```

### Expo Router Detail Navigation

**Source:** `apps/mobile/app/streak/index.tsx` line 236 (`router.back()`); `apps/mobile/app/_layout.tsx` lines 59-65
**Apply to:** `cards/[id].tsx`, any call site navigating to it

```typescript
// Navigate TO detail screen (typedRoutes-safe object form)
router.push({ pathname: '/cards/[id]', params: { id: card.id } });

// Navigate BACK from detail screen
router.back();

// Register in _layout.tsx Stack block
<Stack.Screen name="cards/[id]" options={{ title: '' }} />
```

### State Badge Color Helper

**Source:** `apps/mobile/app/(tabs)/cards/index.tsx` lines 110-114
**Apply to:** Reuse in extended library CardRow, and in card detail screen SRS state display

```typescript
function stateColor(state: DueCard['state']): string {
  if (state === 'new') return textColors.light.brand;
  if (state === 'learning' || state === 'relearning') return '#F0BF38';
  return '#22C55E';
}
// Note: add suspended case → '#5A6995' (muted) when `suspended_at != null`
```

### Gender Bar Color Helper

**Source:** `apps/mobile/app/(tabs)/cards/index.tsx` lines 82-84
**Apply to:** Library CardRow (already there), card detail screen header

```typescript
const genderColor =
  card.gender === 'feminine' ? '#E8658A' : card.gender === 'masculine' ? '#1F3494' : '#F0BF38';
```

### Vitest Pure-Function Test Structure

**Source:** `apps/api/src/lib/homeSummary.test.ts` lines 1-46
**Apply to:** New `cardUtils.test.ts` (covers `filterCards`, `formatDueAt`, `formatLastReviewed`)

```typescript
import { describe, it, expect } from 'vitest';
import { filterCards } from './cardUtils'; // or from mobile lib path

describe('filterCards', () => {
  it('returns all cards when no filters are active', () => {
    // ...
  });
  it('filters by gender with AND logic across dimensions', () => {
    // ...
  });
});
// Run: corepack pnpm exec vitest run apps/api/src/lib/cardUtils.test.ts
// Full suite: corepack pnpm test
```

---

## No Analog Found

| File                                          | Role      | Data Flow    | Reason                                                                                                                                         |
| --------------------------------------------- | --------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/mobile/src/components/SwipeableRow.tsx` | component | event-driven | No swipe/gesture components exist anywhere in the codebase. Use RESEARCH.md Pattern 3 (`ReanimatedSwipeable`) as the implementation reference. |

---

## Critical Pitfalls (for planner action items)

These are not pattern failures — they are gaps the planner must explicitly address:

1. **`GestureHandlerRootView` missing from `_layout.tsx`** — swipes silently no-op without it. Must be the outermost wrapper, outside `QueryClientProvider`. See `_layout.tsx` lines 56-69 for current tree.

2. **Delete FK constraint** — `reviews.card_id → cards.id ON DELETE no action` (verified in `0000_shiny_zombie.sql`). Every DELETE plan must delete reviews rows first, then the card row.

3. **`/due` before `/:id` in route registration** — Hono matches static segments before params only when registered first. `GET /cards/due` hits `/:id` with `id='due'` if order is wrong.

4. **Sentence edit audio staleness** — editing `sentence_pt` orphans `sentence_audio_clip_hash`. Planner must pick Option A (re-synthesize via Narakeet), B (null the hash), or C (accept stale). Open Question 1 from RESEARCH.md.

5. **`suspended` is NOT a `card_state` enum value** — suspension is only the `suspended_at` timestamp column. Never write `state = 'suspended'`.

---

## Metadata

**Analog search scope:** `apps/api/src/routes/`, `apps/api/src/lib/`, `apps/mobile/app/`, `apps/mobile/src/lib/`, `apps/mobile/src/components/`, `packages/db/src/`
**Files scanned:** 12
**Pattern extraction date:** 2026-06-28
