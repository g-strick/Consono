# Phase 2: Review Loop + Home States - Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 5
**Analogs found:** 5 / 5

## File Classification

| New/Modified File                           | Role             | Data Flow                      | Closest Analog                               | Match Quality |
| ------------------------------------------- | ---------------- | ------------------------------ | -------------------------------------------- | ------------- |
| `apps/api/src/routes/home.ts`               | route            | request-response (aggregation) | `apps/api/src/routes/cards.ts`               | role-match    |
| `apps/mobile/src/lib/api.ts`                | utility (client) | request-response               | self (extend existing)                       | exact         |
| `apps/mobile/app/(tabs)/index.tsx`          | component/screen | CRUD + event-driven            | self (wire existing placeholders)            | exact         |
| `apps/mobile/app/review/index.tsx`          | component/screen | event-driven                   | self (wire existing placeholders)            | exact         |
| `apps/mobile/src/components/StreakChip.tsx` | component        | event-driven                   | self (props already exist, no change needed) | exact         |

---

## Pattern Assignments

### `apps/api/src/routes/home.ts` (new route, request-response aggregation)

**Analog:** `apps/api/src/routes/cards.ts` and `apps/api/src/routes/users.ts`

This is a new file. Use the same Hono route factory shape as every other route file.

**Imports pattern** (from `apps/api/src/routes/cards.ts` lines 1-7, `apps/api/src/routes/users.ts` lines 1-5):

```typescript
import { Hono } from 'hono';
import { db, cards, reviews } from '@portuguese-app/db';
import { and, eq, gte, lte, lt, asc } from 'drizzle-orm';
import { V0_USER_ID } from '../lib/constants.js';
```

**Route export shape** (from `apps/api/src/routes/users.ts` lines 6-17 and `apps/api/src/routes/cards.ts` lines 9, 121-137):

```typescript
export const homeRoute = new Hono();

homeRoute.get('/summary', async (c) => {
  // ... queries ...
  return c.json({ ... });
});
```

**Drizzle findMany with where + orderBy** (from `apps/api/src/routes/cards.ts` lines 121-137 — the closest read pattern):

```typescript
// GET /cards/due — cards due for review today
cardsRoute.get('/due', async (c) => {
  const due = await db.query.cards.findMany({
    where: (table, { and, eq, lte }) =>
      and(eq(table.user_id, V0_USER_ID), lte(table.due_at, new Date())),
    orderBy: (table, { asc }) => [asc(table.due_at)],
  });
  return c.json({ cards: result });
});
```

**Drizzle findFirst pattern** (from `apps/api/src/routes/users.ts` lines 8-17):

```typescript
usersRoute.get('/me', async (c) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, V0_USER_ID) });
  if (!user) return c.json({ error: 'user not found' }, 404);
  return c.json({ id: user.id, name: user.display_name, audio_speed: user.audio_speed });
});
```

**No Zod needed** — this is a GET endpoint with no body input; no Zod schema required (consistent with `GET /cards/due` and `GET /users/me`).

**Aggregation logic to implement:**

- `totalCards` — `db.query.cards.findMany({ where: eq(table.user_id, V0_USER_ID) })` then `.length`, or a `count()` expression
- `streak` — query `reviews` joined/filtered by `card_id` belonging to this user, grouped by local day (use JS Date math on `reviewed_at`)
- `todayStats` — `reviews` where `reviewed_at >= localDayStart` (construct `localDayStart = new Date()` set to midnight)
- `nextDueAt` — `cards.findFirst({ where: ..., orderBy: asc(due_at) })` where `due_at > now`
- `recentCards` — `cards.findMany({ where: eq(user_id, V0_USER_ID), orderBy: desc(created_at), limit: 3 })`

**API entry mount** (from `apps/api/src/index.ts` lines 1-15):

```typescript
import { homeRoute } from './routes/home.js';
// ...
app.route('/home', homeRoute);
```

---

### `apps/mobile/src/lib/api.ts` (utility, extend with new GET method)

**Analog:** Self — extend the existing `api` object.

**Full file already read** (`apps/mobile/src/lib/api.ts` lines 1-131).

**`request<T>` helper pattern** (lines 19-29 — all new methods call this):

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

**Existing GET method pattern** (lines 81-83):

```typescript
getMe() {
  return request<Me>('/users/me');
},
```

**New method to add** (copy the `getMe()` shape):

```typescript
export interface HomeSummary {
  totalCards: number;
  streak: { count: number; active: boolean; reviewedToday: boolean };
  todayStats: { reviewed: number; again: number };
  nextDueAt: string | null;
  recentCards: RecentCard[];
}

export interface RecentCard {
  id: number;
  headword: string | null;
  sentence_pt: string | null;
  gender: 'masculine' | 'feminine' | 'common' | null;
  state: 'new' | 'learning' | 'review' | 'relearning';
  created_at: string;
}

// Inside api object:
getHomeSummary() {
  return request<HomeSummary>('/home/summary');
},
```

**TanStack Query key convention** — existing keys are `['cards', 'due']` and `['users', 'me']`. Add `['home', 'summary']`.

---

### `apps/mobile/app/(tabs)/index.tsx` (screen, wire real data into existing states)

**Analog:** Self — the file is already built; this phase replaces hardcoded values and fixes logic.

**Full file already read** (`apps/mobile/app/(tabs)/index.tsx` lines 1-505).

**Existing useQuery pattern to copy for new query** (lines 43-53):

```typescript
const { data, isLoading, isError } = useQuery({
  queryKey: ['cards', 'due'],
  queryFn: () => api.getDueCards(),
  refetchOnWindowFocus: true,
});

const { data: me } = useQuery({
  queryKey: ['users', 'me'],
  queryFn: () => api.getMe(),
  staleTime: 1000 * 60 * 60,
});
```

Add a third query using the same pattern:

```typescript
const { data: homeSummary } = useQuery({
  queryKey: ['home', 'summary'],
  queryFn: () => api.getHomeSummary(),
  refetchOnWindowFocus: true,
});
```

**Placeholder lines to replace:**

1. `streakCount = 1` (line 56) → `homeSummary?.streak.count ?? 0`
2. `getStreakState()` (lines 24-30) — replace body with D-03 logic:
   - `inactive` when streak count ≤ 1 (no active streak)
   - `continued` when `streak.reviewedToday === true`
   - `at-risk` when streak is active but `reviewedToday === false` and due > 0
   - No time gate (D-03 removes the 6pm guard at lines 26-28)
3. First-run detection (line 85-86): replace `dueCount === 0 && !data` with `homeSummary?.totalCards === 0`
4. State precedence (lines 85-89): `totalCards === 0` → EmptyState; then `dueCount > 0` → DailyPickupState; else → AllDoneState
5. `recentCards = [...cards].slice(0, 3)` (line 62) → use `homeSummary?.recentCards ?? []` (these are the most-recently-created, not due cards)

**AllDoneState today stats** (lines 162-196) — currently shows `—`. Replace with real data:

- `reviewed` stat → `homeSummary?.todayStats.reviewed ?? 0`
- `accuracy` stat → derive from `(reviewed - again) / reviewed * 100` with `homeSummary?.todayStats.again`

**DueTile next-batch chip** (line 277) — replace hardcoded `'next batch · 4h'`:

```typescript
// Compute from homeSummary?.nextDueAt (ISO string or null)
const nextBatchLabel = homeSummary?.nextDueAt
  ? computeNextBatchLabel(homeSummary.nextDueAt)  // helper to format "next batch · Xh"
  : 'next batch · —';
<Chip label={nextBatchLabel} variant="brand" />
```

**RecentlyAdded** (lines 291-349) — currently receives `DueCard[]`; update prop type to accept `RecentCard[]` from HomeSummary and adjust field references accordingly (same fields exist on both types).

---

### `apps/mobile/app/review/index.tsx` (screen, wire streak + slow-audio toggle)

**Analog:** Self — already built; this phase removes two placeholders and adds the turtle button.

**Full file already read** (`apps/mobile/app/review/index.tsx` lines 1-508).

**Streak wiring (lines 19, 170, 230):**

Pattern — add a `getHomeSummary` query to the ReviewScreen component (same pattern as HomeScreen above):

```typescript
const { data: homeSummary } = useQuery({
  queryKey: ['home', 'summary'],
  queryFn: () => api.getHomeSummary(),
  staleTime: 30_000,
});
const streakCount = homeSummary?.streak.count ?? 0;
```

Replace:

- Line 170: `<StreakChip count={STREAK_PLACEHOLDER} state="at-risk" />` → `<StreakChip count={streakCount} state={homeSummary?.streak.reviewedToday ? 'continued' : 'at-risk'} />`
- Line 230: `<StreakChip count={STREAK_PLACEHOLDER + 1} state="continued" />` → `<StreakChip count={streakCount} state="continued" />` (post-session count comes from the server; invalidate `['home','summary']` on session done so it refetches)
- Remove `const STREAK_PLACEHOLDER = 12;` (line 19)

**Session done → invalidate home summary** (copy the existing `queryClient.invalidateQueries` pattern at line 65-67):

```typescript
function exitReview() {
  queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
  queryClient.invalidateQueries({ queryKey: ['home', 'summary'] }); // add this
  router.back();
}
```

**Slow-audio toggle (D-09, D-10) — replaces static label at line 353:**

Current (line 353):

```typescript
<Mono surface={nightSurface} tone="faint">
  tap to replay · 0.7× · 1.0× · 1.2×
</Mono>
```

Pattern to replace with — a stateless per-tap turtle button (copy the `TouchableOpacity` shape from the `▶ play` button at line 468):

```typescript
// Add local state for slow playback:
const [isSlowPlay, setIsSlowPlay] = useState(false);

// Turtle button in front phase layout (replaces the speed label):
<TouchableOpacity
  onPress={async () => {
    if (currentCard.sentence_audio_url) {
      await playAudioAtRate(currentCard.sentence_audio_url, 0.7);
    }
  }}
>
  <Mono surface={nightSurface} tone="faint">
    🐢 slow
  </Mono>
</TouchableOpacity>
```

`playAudioAtRate(url, rate)` variant of the existing `playAudio` — add to the component alongside the existing `playAudio` callback (lines 77-86):

```typescript
// Existing playAudio (lines 77-86) — plays at default rate:
const playAudio = useCallback(async (url: string) => {
  try {
    await soundRef.current?.unloadAsync();
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    soundRef.current = sound;
    await sound.playAsync();
  } catch {
    /* non-fatal */
  }
}, []);

// New slow variant — same shape, adds setRate after load:
const playAudioAtRate = useCallback(async (url: string, rate: number) => {
  try {
    await soundRef.current?.unloadAsync();
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    soundRef.current = sound;
    await sound.setRateAsync(rate, true);
    await sound.playAsync();
  } catch {
    /* non-fatal */
  }
}, []);
```

---

### `apps/mobile/src/components/StreakChip.tsx` (component — no file changes required)

**Analog:** Self.

**Full file already read** (`apps/mobile/src/components/StreakChip.tsx` lines 1-89).

The component already accepts `count: number` and `state: StreakState` props and implements the 280ms fill animation. **No changes needed to this file.** Phase 2 only wires real `count` and `state` values at the call sites in `review/index.tsx` and `(tabs)/index.tsx`.

Interface (lines 20-24):

```typescript
export type StreakState = 'inactive' | 'at-risk' | 'continued';

interface Props {
  count: number;
  state: StreakState;
}
```

---

## Shared Patterns

### Hono route file structure

**Source:** `apps/api/src/routes/users.ts` (all routes follow this)
**Apply to:** `apps/api/src/routes/home.ts`

```typescript
import { Hono } from 'hono';
import { db, <tables> } from '@portuguese-app/db';
import { eq } from 'drizzle-orm';
import { V0_USER_ID } from '../lib/constants.js';

export const <name>Route = new Hono();

<name>Route.get('/path', async (c) => {
  // query
  return c.json({ ... });
});
```

### Zod validation (POST routes only)

**Source:** `apps/api/src/routes/reviews.ts` lines 9-13, 34
**Apply to:** Any new POST handlers (none needed for Phase 2 — all new endpoints are GETs)

```typescript
const Schema = z.object({ ... });
const parsed = Schema.safeParse(body);
if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
```

### Drizzle query pattern — findMany with compound where

**Source:** `apps/api/src/routes/cards.ts` lines 122-126
**Apply to:** `apps/api/src/routes/home.ts` for reviews-today and recent-cards queries

```typescript
await db.query.cards.findMany({
  where: (table, { and, eq, lte }) =>
    and(eq(table.user_id, V0_USER_ID), lte(table.due_at, new Date())),
  orderBy: (table, { asc }) => [asc(table.due_at)],
});
```

### TanStack Query — useQuery with refetchOnWindowFocus

**Source:** `apps/mobile/app/(tabs)/index.tsx` lines 43-47
**Apply to:** New `['home', 'summary']` query on HomeScreen and ReviewScreen

```typescript
const { data, isLoading, isError } = useQuery({
  queryKey: ['cards', 'due'],
  queryFn: () => api.getDueCards(),
  refetchOnWindowFocus: true,
});
```

### queryClient.invalidateQueries after mutation

**Source:** `apps/mobile/app/review/index.tsx` lines 64-67
**Apply to:** `exitReview()` in review screen (add `['home', 'summary']` alongside existing `['cards', 'due']` invalidation)

```typescript
function exitReview() {
  queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
  router.back();
}
```

### expo-av Sound playback

**Source:** `apps/mobile/app/review/index.tsx` lines 77-86
**Apply to:** New `playAudioAtRate` function in same file

```typescript
const playAudio = useCallback(async (url: string) => {
  try {
    await soundRef.current?.unloadAsync();
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    soundRef.current = sound;
    await sound.playAsync();
  } catch {
    // audio failure is non-fatal
  }
}, []);
```

---

## No Analog Found

All files for Phase 2 are modifications to existing files or follow direct analogs. No truly novel file patterns exist.

| File                          | Role  | Data Flow       | Note                                                                                                                                                           |
| ----------------------------- | ----- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/routes/home.ts` | route | aggregation GET | Closest analog is `cards.ts` GET `/due` — same shape, heavier Drizzle query; no prior aggregation endpoint exists, but the Hono + Drizzle patterns map cleanly |

---

## Metadata

**Analog search scope:** `apps/api/src/routes/`, `apps/api/src/`, `apps/mobile/app/`, `apps/mobile/src/`, `packages/db/src/`
**Files scanned:** 10 (reviews.ts, cards.ts, users.ts, index.ts, constants.ts, api.ts, (tabs)/index.tsx, review/index.tsx, StreakChip.tsx, schema.ts)
**Pattern extraction date:** 2026-06-22
