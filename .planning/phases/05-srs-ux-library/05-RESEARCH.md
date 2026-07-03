# Phase 5: SRS UX + Library - Research

**Researched:** 2026-06-28
**Domain:** React Native / Expo — swipeable list rows, Drizzle ORM migrations, TanStack Query
**Confidence:** HIGH

---

## Summary

Phase 5 converts the stub library screen into a fully editable, filterable deck manager and
adds suspend/unsuspend as the primary SRS control. The codebase is well-structured: Hono routes
→ Drizzle ORM → PostgreSQL on the API side, Expo Router + TanStack Query on mobile. All the
patterns for this phase already exist in earlier phases; the work is extension, not invention.

Three non-obvious risks must be addressed in planning. First, deleting a reviewed card will throw
a PostgreSQL foreign-key violation — `reviews.card_id` references `cards.id` with `ON DELETE no
action`; the plan must delete reviews transactionally before the card or migrate the constraint.
Second, editing `sentence_pt` orphans the existing `sentence_audio_clip_hash` (the audio still
plays the old text); whether to re-synthesize audio on sentence edit is an open question that
the planner must surface. Third, `GestureHandlerRootView` from `react-native-gesture-handler`
is not present anywhere in the app — swipeable rows will silently no-op without it wrapping the
root tree.

**Primary recommendation:** Use `ReanimatedSwipeable` (from
`react-native-gesture-handler/ReanimatedSwipeable`) — the legacy `Swipeable` export from the
package root is deprecated as of v2. Reanimated v4 with New Architecture (`newArchEnabled: true`)
is already configured; `babel-preset-expo` automatically handles the worklets Babel plugin so no
`babel.config.cjs` changes are needed for ReanimatedSwipeable.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Library shows ALL cards via a new endpoint (`GET /cards` or `GET /cards/all`). Replace
  current `getDueCards()` call.
- **D-02:** Filter chips at top — horizontally scrollable pills, AND logic, four dimensions:
  gender / source tag / register / SRS state (including "suspended").
- **D-03:** Delete + Suspend triggered by swipe-left on a library row (iOS-native). Field edits
  via the card detail screen.
- **D-04:** Unified card detail screen. Tapping any library row opens it. Contains: word/image
  preview, SRS stats, suspend toggle, editable fields, delete action.
- **D-05:** SRS stats = key metrics only (stability, difficulty, SRS state, due date, total
  reviews, last reviewed). No review history log.
- **D-06:** Editable fields = `sentence_pt` + `source_tag` only.
- **D-07:** Suspended card excluded from ALL review queues. `GET /cards/due` must gain a
  `WHERE suspended_at IS NULL` filter. Unsuspend restores previous FSRS state — no reschedule.
- **D-08:** DB migration required — add nullable `suspended_at: timestamp` column to `cards` table.

### Claude's Discretion

- Default sort for library: newest-first by `created_at` descending.
- Search bar: omit (keep it simple per CONTEXT.md instruction).
- Card detail screen route: `app/cards/[id].tsx` (Expo Router convention).

### Deferred Ideas (OUT OF SCOPE)

- SRS-02: Filtered review session picker
- SRS-03: Study ahead
- SRS-04: 5-card sprint / streak rescue
- SRS-05: New cards/day limit setting
- Settings screen / global audio speed preference
- LIB-02 extended editing (headword, gender, stress, register)
  </user_constraints>

---

## Project Constraints (from CLAUDE.md)

The following actionable directives are extracted from `CLAUDE.md` and must be honored in all
implementation tasks for this phase:

| Directive                                                    | Source                 | Impact on Phase 5                                                                               |
| ------------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------- |
| Run `npm test` / `yarn test` after modifications             | CLAUDE.md testing      | Every plan wave must pass `corepack pnpm test` before closing                                   |
| Run `tsc` to check for type errors                           | CLAUDE.md typescript   | No implicit `any`; `AllCard`, `ActiveFilters`, and filter helper must be fully typed            |
| Avoid `any` when possible — use interfaces for object shapes | CLAUDE.md typescript   | `filterCards()` register match must use typed union instead of `as any` (see Pattern 7)         |
| Follow existing code style + ESLint/Prettier                 | CLAUDE.md coding style | Pattern all new code on `apps/api/src/routes/home.ts` and `apps/mobile/src/lib/api.ts` style    |
| Write modular, reusable code                                 | CLAUDE.md coding style | `SwipeableRow`, `FilterChipBar`, stat formatters should be extracted when they exceed ~40 lines |
| Use modern TypeScript features                               | CLAUDE.md typescript   | Discriminated unions and `satisfies` preferred over type assertions                             |

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                           | Research Support                                                                                                      |
| ------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| SRS-01 | User can suspend a card (removed from review queue until unsuspended) | D-07/D-08: `suspended_at` timestamp column; `isNull` filter on `/cards/due`; swipe-left action + detail screen toggle |
| SRS-02 | Filtered review session picker                                        | DEFERRED — out of scope for Phase 5                                                                                   |
| SRS-03 | Study ahead                                                           | DEFERRED — out of scope for Phase 5                                                                                   |
| SRS-04 | 5-card sprint                                                         | DEFERRED — out of scope for Phase 5                                                                                   |
| SRS-05 | New cards per day limit                                               | DEFERRED — out of scope for Phase 5                                                                                   |
| SRS-06 | Per-card stats screen                                                 | D-04/D-05: card detail screen at `app/cards/[id].tsx`; six stat fields from cards row; `StatTile` component grid      |
| LIB-01 | Filter cards by gender, register, source tag, SRS state               | D-02: four filter dimensions, AND logic, extend existing `filterCards()` helper and `Filter` type                     |
| LIB-02 | Edit card fields inline                                               | D-06: `sentence_pt` + `source_tag` only; via card detail screen; `PATCH /cards/:id` endpoint                          |
| LIB-03 | Delete card with confirmation                                         | D-03: swipe-left Delete action + detail screen "Delete card"; requires review cascade or transactional delete         |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability                 | Primary Tier   | Secondary Tier | Rationale                                                                             |
| -------------------------- | -------------- | -------------- | ------------------------------------------------------------------------------------- |
| Suspend/unsuspend state    | API / Database | —              | State lives in `suspended_at` column; API enforces filter on `/cards/due`             |
| Library filter (AND logic) | Mobile client  | —              | All cards fetched once; filter is pure client-side computation on the in-memory array |
| Swipeable row actions      | Mobile client  | —              | UI interaction; `ReanimatedSwipeable` gesture handler in the component layer          |
| Card detail screen         | Mobile client  | API            | Route `app/cards/[id].tsx`; data from `GET /cards/:id` (or cache lookup)              |
| Edit sentence + source tag | API / Database | Mobile client  | `PATCH /cards/:id` validates input via Zod; mobile sends mutation                     |
| Delete card                | API / Database | Mobile client  | Must delete reviews before card row (FK); API owns the transaction                    |
| DB migration               | Database       | —              | `suspended_at` nullable timestamp column added via Drizzle Kit                        |
| Query cache invalidation   | Mobile client  | —              | TanStack Query `invalidateQueries` on every mutation                                  |

---

## Standard Stack

### Core (no new installs — all already in project)

| Library                        | Installed Version | Purpose                                                                                  | Source                               |
| ------------------------------ | ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `react-native-gesture-handler` | 2.28.0            | `ReanimatedSwipeable` for swipe-left row actions                                         | [VERIFIED: node_modules inspection]  |
| `react-native-reanimated`      | 4.1.7             | Animations for ReanimatedSwipeable (SharedValues)                                        | [VERIFIED: node_modules inspection]  |
| `drizzle-orm`                  | ^0.44.0           | Schema extension + migration for `suspended_at`                                          | [VERIFIED: packages/db/package.json] |
| `drizzle-kit`                  | ^0.30.0           | Migration generation and apply                                                           | [VERIFIED: packages/db/package.json] |
| `@tanstack/react-query`        | ^5.100.10         | Data fetching + mutation cache invalidation                                              | [VERIFIED: apps/mobile/package.json] |
| `hono`                         | ^4.7.10           | New API routes (`GET /cards`, `GET /cards/:id`, `PATCH /cards/:id`, `DELETE /cards/:id`) | [VERIFIED: apps/api/package.json]    |
| `zod`                          | ^4.4.3            | Input validation on new route handlers                                                   | [VERIFIED: package.json]             |
| `expo-router`                  | ~6.0.23           | File-based routing for `app/cards/[id].tsx`                                              | [VERIFIED: apps/mobile/package.json] |

### No New Packages Required

This phase introduces zero new npm dependencies. All needed libraries are already installed.

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase. All libraries used are verified existing
project dependencies.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Mobile (Expo Router)
  app/cards/[id].tsx <── tap row
  app/(tabs)/cards/index.tsx
        |
        | swipe-left
        v
  SwipeableRow.tsx
   (ReanimatedSwipeable)
     Suspend action ──┐
     Delete action ───┤
                      |
        ──────────────┘
        |
        v
  PATCH /cards/:id          DELETE /cards/:id
  (suspend toggle:          (transactional:
   set/null suspended_at)    delete reviews, then card)

  GET /cards                GET /cards/:id
  (all cards,               (single card for detail
  newest-first)             screen, stats refresh)

        |
        v
  Drizzle ORM / PostgreSQL
  cards table (+ suspended_at)
  reviews table (FK → cards.id ON DELETE no action)
```

### Recommended Project Structure

```
apps/api/src/
├── routes/cards.ts          # extend: add GET /cards, GET /:id, PATCH /:id, DELETE /:id
├── lib/                     # (no new lib file needed — route logic is thin enough inline)
apps/mobile/
├── app/
│   ├── (tabs)/cards/
│   │   └── index.tsx        # extend: getAllCards(), FilterChipBar, SwipeableRow
│   └── cards/
│       └── [id].tsx         # NEW: card detail screen
├── src/
│   ├── components/
│   │   └── SwipeableRow.tsx # NEW: wraps ReanimatedSwipeable
│   └── lib/
│       └── api.ts           # extend: getAllCards(), getCard(id), updateCard(), deleteCard(), suspendCard()
packages/db/src/
└── schema.ts                # extend: add suspended_at to cards table
packages/db/drizzle/
└── 0002_*.sql               # generated migration
```

### Pattern 1: Drizzle Schema Extension + Migration

**What:** Add `suspended_at` nullable timestamp column to the `cards` table.
**When to use:** Any time a new nullable column is added to an existing production table.
**Precedent:** `0001_redundant_inertia.sql` added `source_tag text` using exactly this pattern.

```typescript
// packages/db/src/schema.ts — add to cards table definition
suspended_at: timestamp('suspended_at'),  // null = active; timestamp = when suspended
```

```sql
-- generated migration (0002_*.sql) — mirrors 0001 precedent
ALTER TABLE "cards" ADD COLUMN "suspended_at" timestamp;
```

**Commands:**

```bash
make db-generate   # cd packages/db && corepack pnpm exec drizzle-kit generate
make db-migrate    # cd packages/db && corepack pnpm exec drizzle-kit migrate
```

[VERIFIED: Makefile + drizzle.config.ts + 0001 migration precedent]

### Pattern 2: New Hono Routes on cardsRoute

**What:** Extend the existing `cardsRoute` in `apps/api/src/routes/cards.ts`.
**When to use:** Every new card-related API endpoint.

**Route registration order:** Register `/due` (static segment) BEFORE `/:id` (dynamic param) to
ensure Hono's static-over-param priority applies. If `/due` is registered after `/:id`, the
request `GET /cards/due` will match `/:id` with `id = 'due'` and `parseInt('due')` → NaN → 400
Bad Request before ever reaching the due-cards handler.

```typescript
// Source: existing cards.ts pattern — apps/api/src/routes/cards.ts
import { isNull, eq, and, desc } from 'drizzle-orm';

/** GET /cards — all cards for the user, newest-first */
cardsRoute.get('/', async (c) => {
  const allCards = await db.query.cards.findMany({
    where: (table, { eq }) => eq(table.user_id, V0_USER_ID),
    orderBy: (table, { desc }) => [desc(table.created_at)],
  });
  // map audio URLs same as /due
  return c.json({ cards: allCards.map(mapAudioUrls) });
});

/** GET /cards/due — extend: exclude suspended cards (D-07) */
// WHERE suspended_at IS NULL added via isNull(table.suspended_at)
// NOTE: keep this registered BEFORE /:id to avoid param-shadowing

/** PATCH /cards/:id — edit sentence_pt and/or source_tag */
const PatchCardInput = z.object({
  sentence_pt: z.string().min(1).optional(),
  source_tag: z.string().nullable().optional(),
});

cardsRoute.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  // Validate + update via db.update(cards).set({...}).where(eq(cards.id, id))
});

/** DELETE /cards/:id — transactional: delete reviews first, then card */
cardsRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  // MUST delete reviews before card (FK constraint — see Pitfall 1)
  await db.delete(reviews).where(eq(reviews.card_id, id));
  await db.delete(cards).where(and(eq(cards.id, id), eq(cards.user_id, V0_USER_ID)));
});
```

[VERIFIED: existing cards.ts + schema.ts FK analysis]

### Pattern 3: ReanimatedSwipeable Component

**What:** The non-deprecated swipeable row component. Uses Reanimated SharedValues instead of
`Animated.Value`. Import from `react-native-gesture-handler/ReanimatedSwipeable`.
**When to use:** Any list row that reveals actions on swipe.

**Babel plugin (VERIFIED from source):** `babel-preset-expo/build/index.js` contains this logic:

```javascript
hasModule('react-native-worklets') &&
platformOptions.worklets !== false &&
platformOptions.reanimated !== false
  ? [require('react-native-worklets/plugin')]
  : hasModule('react-native-reanimated') &&
    platformOptions.reanimated !== false && [require('react-native-reanimated/plugin')];
```

In this project: `react-native-worklets` is NOT installed (confirmed by `.pnpm` directory scan).
`react-native-reanimated` IS installed at v4.1.7. `react-native-reanimated/plugin/index.js`
EXISTS at the required path. Therefore `babel-preset-expo` automatically applies
`react-native-reanimated/plugin` — no `babel.config.cjs` change is needed.

[VERIFIED: babel-preset-expo/build/index.js source code + node_modules directory scan]

**CRITICAL SETUP:** `GestureHandlerRootView` from `react-native-gesture-handler` MUST wrap the
root navigator. It is NOT present anywhere in the current codebase. Add it to `app/_layout.tsx`.

```typescript
// apps/mobile/app/_layout.tsx — add GestureHandlerRootView wrapper
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// ...
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      {/* ... rest of tree */}
    </QueryClientProvider>
  </GestureHandlerRootView>
);
```

```typescript
// apps/mobile/src/components/SwipeableRow.tsx
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { SharedValue } from 'react-native-reanimated';
import { TouchableOpacity, View, Text } from 'react-native';
import { useRef } from 'react';

interface SwipeableRowProps {
  onSuspend: () => void;
  onDelete: () => void;
  isSuspended: boolean;
  children: React.ReactNode;
}

export function SwipeableRow({ onSuspend, onDelete, isSuspended, children }: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  const renderRightActions = (
    _progress: SharedValue<number>,
    _translation: SharedValue<number>,
    swipeable: SwipeableMethods,
  ) => (
    <View style={{ flexDirection: 'row' }}>
      {/* Suspend: 80px, muted neutral */}
      <TouchableOpacity
        style={{ width: 80, justifyContent: 'center', alignItems: 'center',
                 backgroundColor: 'rgba(0,0,0,0.08)' }}
        onPress={() => { swipeable.close(); onSuspend(); }}
      >
        {/* Ionicons pause-circle (unsuspended) or play-circle (suspended) */}
        <Text style={{ color: 'rgba(0,0,0,0.60)', fontSize: 11 }}>
          {isSuspended ? 'Unsuspend' : 'Suspend'}
        </Text>
      </TouchableOpacity>
      {/* Delete: 80px, destructive red */}
      <TouchableOpacity
        style={{ width: 80, justifyContent: 'center', alignItems: 'center',
                 backgroundColor: '#C84A40' }}
        onPress={() => { swipeable.close(); onDelete(); }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 11 }}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}
```

[VERIFIED: ReanimatedSwipeableProps.d.ts in node_modules; `SwipeableMethods` interface confirmed]

### Pattern 4: TanStack Query Key Convention + Invalidation

**What:** Existing keys: `['cards', 'due']` (review queue) and `['home', 'summary']`. New key
for library: `['cards', 'all']`. Invalidate both `cards` keys AND `home` key on every mutation.
**Why invalidate home:** suspend/delete changes `totalCards` in the home summary response.

```typescript
// apps/mobile/src/lib/api.ts — new methods
getAllCards() {
  return request<{ cards: AllCard[] }>('/cards');
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

```typescript
// Mutation invalidation pattern (mirrors existing add wizard pattern)
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: () => api.deleteCard(cardId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['cards'] }); // invalidates both 'all' and 'due'
    queryClient.invalidateQueries({ queryKey: ['home', 'summary'] }); // totalCards changes
  },
});
```

[VERIFIED: existing cards/index.tsx, add/index.tsx patterns]

### Pattern 5: AllCard Type Extension

The existing `DueCard` interface in `api.ts` is missing fields needed for SRS stats and the
new `suspended_at` column. A new `AllCard` interface must be defined:

```typescript
// apps/mobile/src/lib/api.ts — new interface
export interface AllCard extends DueCard {
  // Fields on DueCard already: id, card_kind, headword, gendered_form, gender,
  // stress_marker, usage_context, register_tag, sounds_like, image_url,
  // sentence_pt, audio_url, sentence_audio_url, state, due_at
  // New fields needed for Phase 5:
  source_tag: string | null; // for filter + edit
  stability: number | null; // SRS-06 stat
  difficulty: number | null; // SRS-06 stat
  reps: number; // SRS-06 stat (total reviews)
  lapses: number; // (informational)
  last_reviewed_at: string | null; // SRS-06 stat
  created_at: string; // for newest-first sort
  suspended_at: string | null; // null = active; timestamp string = suspended
}
```

### Pattern 6: Card Detail Screen Route

**Expo Router file-based routing.** The project already uses this pattern for `streak/index.tsx`
and `review/index.tsx`. Detail screens with dynamic params use `[id].tsx`.

**typedRoutes is enabled** (`app.json` `"typedRoutes": true`). The template-literal form
`router.push(\`/cards/${card.id}\`)` may not satisfy the typed-route checker. Use the object
form instead — it is unambiguously type-safe:

```typescript
// app/cards/[id].tsx — route: /cards/123
import { useLocalSearchParams, Stack } from 'expo-router';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = parseInt(id, 10); // string → number at the boundary
  if (isNaN(cardId)) return null; // guard against malformed params

  const { data } = useQuery({
    queryKey: ['cards', cardId], // per-card key
    queryFn: () => api.getCard(cardId),
  });
  // ...
}
```

**Navigation from library row tap (typedRoutes-safe form):**

```typescript
import { router } from 'expo-router';
// inside CardRow onPress — use object form for typed-routes compatibility:
router.push({ pathname: '/cards/[id]', params: { id: card.id } });
```

**Stack.Screen registration** — must be added to `app/_layout.tsx`:

```typescript
<Stack.Screen name="cards/[id]" options={{ title: '' }} />
```

[VERIFIED: app/_layout.tsx pattern for streak/index and review/index; app.json typedRoutes confirmed]

### Pattern 7: Library Filter Extension

Extend the existing `Filter` type and `filterCards()` in `cards/index.tsx`. The current
implementation has `type Filter = 'all' | 'new' | 'learning' | 'review'` with a flat filter
value. Phase 5 needs multi-dimensional filters (AND logic across 4 dimensions).

**`source_tag` chip population strategy:** `source_tag` is free-form text from the add wizard
(WhatsApp / Instagram / Netflix + custom strings). The filter chip bar derives its source_tag
chips from the distinct `source_tag` values present in the fetched `AllCard[]` array — not from
a hardcoded list. This means the chip row is data-driven: if no cards have a custom source tag,
no custom chip appears. The UI-SPEC hardcodes "WhatsApp", "Instagram", "Netflix" as canonical
values that always appear; custom values appear only when present in data.

**`vulgar` is in the register enum but is not a filter chip.** Vulgar cards appear in the
library without a register filter (i.e., when no register filter is active, all cards including
vulgar ones are shown). Do not add a "Vulgar" chip to the filter bar.

```typescript
// Extend Filter type to multi-dimensional
// Register values come from registerTagEnum in schema.ts — use the union type, not 'as any'
type RegisterTag = 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar';
type GenderValue = 'masculine' | 'feminine' | 'common';
type SrsStateFilter = 'new' | 'learning' | 'review' | 'relearning' | 'suspended';

type ActiveFilters = {
  gender: GenderValue[];
  source_tag: string[];
  register: RegisterTag[];
  srs_state: SrsStateFilter[];
};

function filterCards(cards: AllCard[], filters: ActiveFilters): AllCard[] {
  return cards.filter((c) => {
    const genderMatch =
      filters.gender.length === 0 ||
      (c.gender != null && filters.gender.includes(c.gender as GenderValue));
    const sourceMatch =
      filters.source_tag.length === 0 ||
      (c.source_tag != null && filters.source_tag.includes(c.source_tag));
    const registerMatch =
      filters.register.length === 0 ||
      (c.register_tag != null && filters.register.includes(c.register_tag as RegisterTag));
    const stateMatch =
      filters.srs_state.length === 0 ||
      (filters.srs_state.includes('suspended')
        ? c.suspended_at != null
        : c.suspended_at == null && filters.srs_state.includes(c.state as SrsStateFilter));
    return genderMatch && sourceMatch && registerMatch && stateMatch;
  });
}
```

Note: `as GenderValue` and `as RegisterTag` casts above are safe because the DB enforces enum
constraints — the column cannot hold values outside the defined enum. Replace with a schema-
generated `$inferSelect` type when Drizzle's infer utilities are available in the mobile layer.
[VERIFIED: existing filterCards + Filter type in cards/index.tsx; schema.ts enum definitions]

### Pattern 8: Delete with Confirmation (Alert.alert)

The existing `add/index.tsx` uses `Alert.prompt`. Delete confirmation uses `Alert.alert` (matches
the copywriting contract in UI-SPEC).

```typescript
function confirmDelete(headword: string | null, onConfirm: () => void) {
  Alert.alert(
    'Delete card?',
    `This will permanently remove "${headword ?? 'this card'}" and its review history.`,
    [
      { text: 'Keep card', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ],
  );
}
```

[VERIFIED: Alert imported in add/index.tsx; Alert.alert RN built-in]

### Anti-Patterns to Avoid

- **Importing `Swipeable` from the package root:** `import Swipeable from 'react-native-gesture-handler'` gives the deprecated Animated-based component. Always import from `react-native-gesture-handler/ReanimatedSwipeable`.
- **Deleting a card with a bare `db.delete(cards)`:** Fails at runtime with FK violation for any card with reviews. Must delete reviews first in the same transaction (or use a single `db.transaction()` call).
- **Skipping `GestureHandlerRootView`:** Gesture handler silently no-ops without it. Swipes won't register. Must be added to `app/_layout.tsx` before any Swipeable works.
- **Invalidating only `['cards', 'all']`:** Mutations also change `totalCards` in home summary. Invalidate `['home', 'summary']` too.
- **Treating `[id]` param as a number:** `useLocalSearchParams` returns strings. Always `parseInt(id, 10)` at the boundary and guard `isNaN(cardId)`.
- **Registering `/:id` before `/due`:** Static routes must be registered before parameterized routes in Hono. Otherwise `GET /cards/due` hits the `:id` handler with `id = 'due'`.
- **Using `router.push(\`/cards/${id}\`)` when typedRoutes is enabled:** Template-literal push may fail the typed-route checker. Use `router.push({ pathname: '/cards/[id]', params: { id } })`.

---

## Don't Hand-Roll

| Problem                      | Don't Build                    | Use Instead                                                        | Why                                                                                                  |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Swipe gesture + animation    | Custom PanResponder + Animated | `ReanimatedSwipeable` from `react-native-gesture-handler`          | Handles velocity, thresholds, overshoot, simultaneous gestures, accessibility                        |
| Confirmation dialog          | Custom modal component         | `Alert.alert()` (RN built-in)                                      | iOS native appearance, handles button styling, already used in project                               |
| Date formatting for stats    | Custom date math               | Inline JS date logic (no lib needed for 6 simple cases)            | Only 6 formats needed; adding a lib would be over-engineering                                        |
| Drizzle migration files      | Hand-written SQL               | `make db-generate` → `make db-migrate`                             | Drizzle Kit infers correct ALTER TABLE; avoids column type mismatches                                |
| TanStack Query key structure | Custom cache management        | Follow existing `['cards', 'due']` / `['home', 'summary']` pattern | Already established; `invalidateQueries({ queryKey: ['cards'] })` invalidates all `cards/*` sub-keys |

---

## Common Pitfalls

### Pitfall 1: FK Constraint Blocks Card Delete

**What goes wrong:** `DELETE FROM cards WHERE id=X` throws a PostgreSQL FK violation for any
card that has been reviewed (which is almost all useful cards).
**Why it happens:** `reviews.card_id` → `cards.id` with `ON DELETE no action` (verified in
`0000_shiny_zombie.sql` initial migration).
**How to avoid:** In `DELETE /cards/:id` route, delete reviews first:

```typescript
await db.delete(reviews).where(eq(reviews.card_id, id));
await db.delete(cards).where(and(eq(cards.id, id), eq(cards.user_id, V0_USER_ID)));
```

Alternatively, add `ON DELETE CASCADE` via a new Drizzle migration on the reviews FK. The
transactional delete is simpler and requires no additional migration.
**Warning signs:** `error: update or delete on table "cards" violates foreign key constraint` in
API logs.

### Pitfall 2: GestureHandlerRootView Missing

**What goes wrong:** Swipe gestures are silently swallowed. The rows appear but swiping does
nothing. No error is thrown.
**Why it happens:** `react-native-gesture-handler` requires its root provider to intercept
gesture events before React Navigation. Without `GestureHandlerRootView` at the tree root,
gestures never reach `Swipeable` components.
**How to avoid:** Add `<GestureHandlerRootView style={{ flex: 1 }}>` as the outermost wrapper
in `app/_layout.tsx` — outside `QueryClientProvider` and `ThemeContext.Provider`.
**Warning signs:** Swipe renders nothing, no `onSwipeableOpen` callbacks fire.

### Pitfall 3: Deprecated Swipeable Import

**What goes wrong:** `import Swipeable from 'react-native-gesture-handler'` compiles fine but
uses the deprecated Animated-based component with a different callback API (`AnimatedInterpolation`
instead of `SharedValue<number>`). Type errors appear when passing `swipeableMethods` to
`renderRightActions`.
**Why it happens:** The package root `src/index.ts` still exports the deprecated `Swipeable`.
**How to avoid:** Always import from `react-native-gesture-handler/ReanimatedSwipeable`:

```typescript
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
```

[VERIFIED: node_modules source inspection]

### Pitfall 4: Sentence Edit Orphans Audio

**What goes wrong:** After editing `sentence_pt`, the review screen still plays the old audio
because `sentence_audio_clip_hash` still points to the pre-edit content hash.
**Why it happens:** Audio is content-addressed by SHA-256(sentence text). Editing the text
without regenerating audio leaves the hash pointing to the old clip.
**How to avoid:** See Open Question 1. Either: (a) trigger audio re-synthesis on sentence save
(adds Narakeet API call to the PATCH route), or (b) null out `sentence_audio_clip_hash` on
sentence edit (card becomes silent until re-approved). The planner must choose.
**Warning signs:** Edited sentence text on detail screen, but audio plays original sentence.

### Pitfall 5: `suspended` is Not a `card_state` Enum Value

**What goes wrong:** Trying to store `'suspended'` in the `state` column fails because
`cardStateEnum` only has `('new', 'learning', 'review', 'relearning')`. Similarly, filtering
for `state = 'suspended'` returns zero rows.
**Why it happens:** The decision (D-08) correctly uses a separate `suspended_at` timestamp, not
the state enum — but a careless implementation might try to add `suspended` as a state value.
**How to avoid:** Suspension is ONLY the `suspended_at` column. The `state` field is never
written during suspend/unsuspend. The SRS state badge shows "Suspended" when `suspended_at IS NOT
NULL` regardless of the `state` value.

### Pitfall 6: `totalCards` in Home Summary Stale After Delete

**What goes wrong:** Library shows N-1 cards after delete but home screen still shows N total
cards until the next refresh.
**Why it happens:** `GET /home/summary` response is cached under `['home', 'summary']`. The
delete mutation only invalidates `['cards']` keys.
**How to avoid:** Delete and suspend mutations must also call:

```typescript
queryClient.invalidateQueries({ queryKey: ['home', 'summary'] });
```

---

## Code Examples

### SRS Stat Formatting (D-05)

```typescript
// Source: UI-SPEC stat formatting table
function formatDueAt(dueAt: string): string {
  const due = new Date(dueAt);
  const now = new Date();
  const todayStr = now.toDateString();
  const tomorrowStr = new Date(now.getTime() + 86400_000).toDateString();
  if (due.toDateString() <= todayStr) return 'Today';
  if (due.toDateString() === tomorrowStr) return 'Tomorrow';
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // "Jan 3"
}

function formatLastReviewed(lastReviewedAt: string | null): string {
  if (!lastReviewedAt) return 'Never';
  const last = new Date(lastReviewedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}
```

### FilterChipBar Active State Override

```typescript
// Chip active state override (UI-SPEC: active = cobalt fill, white text)
// The existing <Chip> component only has 'default' and 'brand' variants.
// 'brand' variant = rgba(31,52,148,0.08) background — this is NOT the active chip fill.
// Active filter chip uses solid #1F3494 background (not the tinted brand variant).
// Apply via inline style override on <Chip> container:
<TouchableOpacity onPress={...}>
  <Chip
    label={label}
    variant={isActive ? 'default' : 'default'}
    style={isActive ? {
      backgroundColor: '#1F3494',
      borderColor: '#142468',
    } : undefined}
  />
  {/* Text color override also needed for active: white on cobalt */}
</TouchableOpacity>
```

**Note:** The `Chip` component doesn't expose a text-color override prop. When implementing
active filter chips, either: (a) pass a custom `style` prop and also pass `color` prop
(which overrides text + derives bg), or (b) render the chip label directly in a custom pill
rather than using `<Chip>`. The `<Chip color>` prop auto-derives bg at 6% opacity, so it won't
produce a solid cobalt fill. A custom inline pill is the cleaner approach for active filter chips.

### Suspend Toggle in Detail Screen

```typescript
// apps/mobile/app/cards/[id].tsx — suspend button
const suspendMutation = useMutation({
  mutationFn: (suspend: boolean) => api.suspendCard(cardId, suspend),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['cards'] });
    queryClient.invalidateQueries({ queryKey: ['home', 'summary'] });
  },
});

// Render: toggle label based on current suspended state
<TouchableOpacity
  style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: 14 }}
  onPress={() => suspendMutation.mutate(!card.suspended_at)}
>
  <Body tone="muted">{card.suspended_at ? 'Unsuspend card' : 'Suspend card'}</Body>
</TouchableOpacity>
```

---

## Assumptions Log

| #   | Claim                                                                                                                                                                                                                    | Section               | Risk if Wrong                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------- |
| A1  | Suspending a card requires no ts-fsrs interaction — just writing `suspended_at` and nulling it on unsuspend, with `/cards/due` gaining an `isNull(suspended_at)` filter. The existing FSRS state is preserved unchanged. | Architecture Patterns | Low risk — D-07 explicitly says "no reschedule"; confirmed by schema inspection |
| A2  | `GET /cards/:id` is a separate endpoint (rather than reading from `['cards','all']` cache on the client). This keeps detail screen stats fresh after edits.                                                              | Pattern 6             | Low risk — either approach works; dedicated endpoint is marginally safer        |
| A3  | Sentence edit does NOT re-synthesize audio (audio stale after edit). See Open Question 1.                                                                                                                                | Pitfall 4             | MEDIUM — if user expects audio to update after editing sentence, this is a bug  |
| A4  | FilterChipBar extracts to `src/components/FilterChipBar.tsx` if >40 lines (UI-SPEC discretion clause).                                                                                                                   | Architecture          | Low risk — pure organization decision                                           |

---

## Open Questions

### 1. Sentence Edit: Stale Audio (HIGH PRIORITY — planner must resolve)

- **What we know:** Editing `sentence_pt` does not update `sentence_audio_clip_hash`. The review screen plays audio keyed by the hash.
- **What's unclear:** Should a sentence edit trigger audio re-synthesis via the Narakeet API? Or accept stale audio (silent until the card is re-approved somehow)?
- **Options:**
  - **Option A (re-synthesize):** `PATCH /cards/:id` calls `synthesize(sentence_pt)`, inserts/upserts the new `audio_clips` row, updates `sentence_audio_clip_hash`. Costs a Narakeet API call per sentence edit.
  - **Option B (null audio):** Set `sentence_audio_clip_hash = null` on sentence edit. Card becomes silent in review until re-created.
  - **Option C (stale, do nothing):** Leave hash unchanged. Audio plays old sentence — low-quality but zero cost.
- **Recommendation:** Surface to user in planning. Phase 4 (plan 4.2) set precedent that sentence edits regenerate audio in the Add wizard; Option A is consistent with that precedent.

### 2. `GET /cards/:id` vs. Cache Lookup for Detail Screen

- **What we know:** Detail screen needs all fields including `suspended_at`, `stability`, `difficulty`, `reps`, `last_reviewed_at`.
- **What's unclear:** Whether a dedicated `GET /cards/:id` endpoint is preferable to finding the card by id in the `['cards', 'all']` cached array.
- **Recommendation:** Add `GET /cards/:id` endpoint. Avoids stale stats if the user edits a card and then navigates back to the detail screen. The endpoint is minimal Drizzle `.findFirst()` — low implementation cost.

---

## Environment Availability

| Dependency                                           | Required By             | Available                            | Version          | Fallback   |
| ---------------------------------------------------- | ----------------------- | ------------------------------------ | ---------------- | ---------- |
| `react-native-gesture-handler`                       | SwipeableRow            | Yes                                  | 2.28.0           | —          |
| `react-native-reanimated`                            | ReanimatedSwipeable     | Yes                                  | 4.1.7            | —          |
| `drizzle-kit`                                        | DB migration generation | Yes                                  | ^0.30.0 (devDep) | —          |
| PostgreSQL (via DATABASE_URL)                        | Migration apply         | Yes (assumed — used in prior phases) | —                | —          |
| Narakeet API (if Option A chosen for audio re-synth) | PATCH /cards/:id        | ASSUMED                              | —                | Option B/C |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Narakeet API (conditional on Open Question 1 resolution).

---

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` (key absent) — treating as
enabled.

### Test Framework

| Property           | Value                                                      |
| ------------------ | ---------------------------------------------------------- |
| Framework          | vitest ^3                                                  |
| Config file        | `/Users/graysonstricker/Programs/Consono/vitest.config.ts` |
| Quick run command  | `corepack pnpm exec vitest run apps/api/src/lib/`          |
| Full suite command | `corepack pnpm test` (alias: `make test`)                  |

### Phase Requirements → Test Map

| Req ID | Behavior                                                                           | Test Type          | Automated Command                                                                      | File Exists? |
| ------ | ---------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------- | ------------ |
| SRS-01 | `suspended_at` filter excludes suspended cards from `/cards/due` result            | unit               | `corepack pnpm exec vitest run apps/api/src/lib/` (new test in lib if logic extracted) | Wave 0       |
| SRS-06 | Stat formatting functions (formatDueAt, formatLastReviewed) return correct strings | unit               | `corepack pnpm exec vitest run apps/api/src/lib/`                                      | Wave 0       |
| LIB-01 | `filterCards()` with multi-dimensional AND filters correctly narrows AllCard array | unit               | `corepack pnpm exec vitest run apps/api/src/lib/`                                      | Wave 0       |
| LIB-02 | PATCH /cards/:id updates sentence_pt and source_tag fields only                    | integration/manual | Manual — requires DB; no integration test harness in project                           | manual-only  |
| LIB-03 | DELETE /cards/:id succeeds for reviewed card (reviews deleted first)               | integration/manual | Manual — requires DB                                                                   | manual-only  |

**Manual-only justification:** Routes require a live PostgreSQL connection; the project has no
test database or route-level integration test harness (API devDependencies contain only `tsx` +
TypeScript). The vitest suite covers pure lib functions only (matching `homeSummary.test.ts` and
`streakStats.test.ts` precedents).

### Sampling Rate

- **Per task commit:** `corepack pnpm exec vitest run apps/api/src/lib/`
- **Per wave merge:** `corepack pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/lib/cardUtils.test.ts` (or inline in a route test) — covers SRS-01 filter logic and stat formatting
- [ ] `apps/api/src/lib/filterCards.test.ts` — covers LIB-01 multi-dimensional filter

_(These are pure function tests, no DB needed — consistent with homeSummary.test.ts pattern)_

---

## Security Domain

`security_enforcement` not set in config — treating as enabled.

### Applicable ASVS Categories

| ASVS Category         | Applies       | Standard Control                                                                                  |
| --------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| V2 Authentication     | No            | V0 single-user — no auth yet (Phase 6)                                                            |
| V3 Session Management | No            | No sessions in V0                                                                                 |
| V4 Access Control     | Yes (partial) | All routes scope by `V0_USER_ID`; PATCH/DELETE must verify `user_id = V0_USER_ID` before mutating |
| V5 Input Validation   | Yes           | Zod schemas on PATCH body; `parseInt` at id boundary; reject NaN ids                              |
| V6 Cryptography       | No            | No new crypto in this phase                                                                       |

### Known Threat Patterns

| Pattern                          | STRIDE    | Standard Mitigation                                                                          |
| -------------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| IDOR on PATCH /cards/:id         | Tampering | `WHERE id=X AND user_id=V0_USER_ID` in every Drizzle query — never update without user scope |
| Unconstrained sentence_pt length | Tampering | Zod `.max(500)` or reasonable max on sentence input                                          |
| NaN card id from bad route param | Tampering | `isNaN(id) → 400 Bad Request` check before any DB call                                       |

---

## State of the Art

| Old Approach                                                              | Current Approach                                                                        | When Changed           | Impact                                                                                                                                           |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Swipeable` from `react-native-gesture-handler` root                      | `ReanimatedSwipeable` from `react-native-gesture-handler/ReanimatedSwipeable`           | v2.x                   | New API uses `SharedValue<number>` (not `Animated.Value`), `SwipeableMethods` object instead of class ref                                        |
| Reanimated worklet Babel plugin manual (`react-native-reanimated/plugin`) | Auto-configured by `babel-preset-expo` (verified in `babel-preset-expo/build/index.js`) | SDK 54 / Reanimated v4 | No manual babel.config change needed for Expo projects; falls through to `react-native-reanimated/plugin` when `react-native-worklets` is absent |

**Deprecated/outdated:**

- `Swipeable` (package root export): deprecated — use `ReanimatedSwipeable` instead
- `AnimatedInterpolation` callbacks in `renderRightActions`: old API — new API passes `SharedValue<number>` + `SwipeableMethods`

---

## Sources

### Primary (HIGH confidence)

- Node modules inspection: `react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable/ReanimatedSwipeableProps.d.ts` — SwipeableProps interface, SwipeableMethods verified
- Node modules inspection: `react-native-gesture-handler/src/index.ts` — GestureHandlerRootView export confirmed
- **`babel-preset-expo/build/index.js` source code** — exact conditional logic for auto-configuring `react-native-reanimated/plugin` verified directly [VERIFIED]
- Node modules scan: `react-native-worklets` package absent from `.pnpm` tree; `react-native-reanimated/plugin/index.js` exists at the expected require path [VERIFIED]
- Codebase files read: `packages/db/src/schema.ts`, `apps/api/src/routes/cards.ts`, `apps/mobile/src/lib/api.ts`, `apps/mobile/app/(tabs)/cards/index.tsx`, `apps/mobile/app/_layout.tsx`, `apps/mobile/babel.config.cjs`, `Makefile`, `apps/mobile/app.json`
- `packages/db/drizzle/0000_shiny_zombie.sql` — FK constraint `ON DELETE no action` verified (Delete pitfall)
- `packages/db/drizzle/0001_redundant_inertia.sql` — migration precedent for adding nullable column

### Secondary (MEDIUM confidence)

- None in this revision — all previously MEDIUM claims have been verified against source.

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified in node_modules and package.json files
- Architecture: HIGH — all patterns verified against existing codebase files
- Pitfalls: HIGH — FK constraint and GestureHandlerRootView absence verified by direct inspection; babel plugin auto-configuration verified from `babel-preset-expo/build/index.js` source; audio-staleness pitfall is logically derived from content-addressed audio design
- Migration commands: HIGH — verified from Makefile + drizzle.config.ts

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (30 days — stable stack)
