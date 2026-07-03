<!-- generated-by: gsd-doc-writer -->

# apps/mobile

Expo + React Native app for Consono — a Portuguese spaced-repetition flashcard app that uses AI to generate word and sentence cards with images, audio, and i+1 example sentences.

Part of the [Consono monorepo](../../README.md).

## How to run

From the monorepo root or this directory:

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start the Expo dev server
pnpm --filter @portuguese-app/mobile start

# Or run directly from this directory
cd apps/mobile
npx expo start
```

Target platforms:

```bash
npx expo start --ios
npx expo start --android
```

The app connects to the local API server at port 3000. In dev mode the host is auto-detected from Expo's `hostUri` so the app works on a physical device without manual IP configuration. Override with `EXPO_PUBLIC_API_URL` if needed.

## Directory structure

```text
apps/mobile/
├── app/                        # Expo Router file-based routes
│   ├── _layout.tsx             # Root layout — fonts, QueryClient, ThemeContext, Stack nav
│   ├── (tabs)/                 # Bottom tab navigator
│   │   ├── _layout.tsx         # Tab bar config (Home, Cards, Add, Settings)
│   │   ├── index.tsx           # Home screen — due count, streak chip, recent cards
│   │   ├── cards/index.tsx     # Cards screen — filterable card list with swipe actions
│   │   ├── add/index.tsx       # Add wizard — multi-step card creation flow
│   │   └── settings/index.tsx  # Settings screen — version info
│   ├── cards/[id].tsx          # Card detail screen — full card info and stats
│   ├── review/index.tsx        # Review screen — full-screen FSRS review session
│   └── streak/index.tsx        # Streak detail — heatmaps, stats, personal bests
├── src/
│   ├── components/             # Shared UI primitives
│   │   ├── Type.tsx            # Surface-driven text: Display, Body, Mono, Num, Action, Heading
│   │   ├── Surface.tsx         # Card container with optional gender left-rail
│   │   ├── Chip.tsx            # Pill label (default / brand variants)
│   │   ├── StreakChip.tsx      # Animated streak indicator (inactive/at-risk/continued)
│   │   ├── StatTile.tsx        # Stat display tile (label + big number)
│   │   ├── Heatmap.tsx         # YearHeatmap and MonthHeatmap calendar grids
│   │   ├── RatingButtons.tsx   # Again / Hard / Good / Easy review rating row
│   │   ├── RatingDistribution.tsx  # Bar chart of rating breakdown
│   │   └── SwipeableRow.tsx    # Swipeable list row with gesture-driven reveal actions
│   ├── lib/
│   │   ├── api.ts              # Typed API client — all REST calls, TypeScript interfaces
│   │   ├── theme.ts            # Color tokens, font constants, ThemeContext, textForSurface()
│   │   ├── cardUtils.ts        # Card filtering, SRS state types, due-date formatting helpers
│   │   ├── detectKind.ts       # Pure function: detects 'word' vs 'sentence' from input text
│   │   ├── useNightSurface.ts  # Hook: returns 'oled' at night in system dark mode, else 'light'
│   │   ├── cardUtils.test.ts   # Unit tests for cardUtils
│   │   ├── detectKind.test.ts  # Unit tests for detectKind
│   │   └── useNightSurface.test.ts  # Unit tests for isOledSurface
│   ├── providers/              # External service integrations (called by the API server)
│   │   ├── llm.ts              # OpenRouter / Gemini 2.5 Flash Lite — word field extraction
│   │   ├── tts.ts              # Narakeet TTS — Portuguese audio synthesis
│   │   └── image-search.ts     # Pexels API — image search for card images
│   └── index.ts                # Package stub (empty export)
├── assets/images/              # App icons, splash screen, favicon
├── app.json                    # Expo config (name: Consono, slug: consono)
├── babel.config.cjs            # Babel — expo preset with NativeWind jsxImportSource
├── metro.config.cjs            # Metro bundler config
├── tailwind.config.js          # NativeWind / Tailwind config with brand color tokens
├── global.css                  # Tailwind base styles imported by root layout
├── tsconfig.json               # TypeScript — strict, @/* path alias resolves to ./
└── package.json
```

## Navigation structure

Expo Router file-based routing with a `Stack` at the root:

| Route                   | Presentation    | Description                                          |
| ----------------------- | --------------- | ---------------------------------------------------- |
| `(tabs)`                | default         | Bottom tab navigator                                 |
| `(tabs)/index`          | tab             | Home — daily pickup, streak, due cards               |
| `(tabs)/cards/index`    | tab             | Cards list with state filter chips and swipe actions |
| `(tabs)/add/index`      | tab             | Add wizard (word: 4 steps, sentence: 3 steps)        |
| `(tabs)/settings/index` | tab             | App settings and version                             |
| `cards/[id]`            | default stack   | Card detail — full card info and SRS stats           |
| `review/index`          | fullScreenModal | FSRS review session                                  |
| `streak/index`          | default stack   | Streak detail with heatmaps and personal bests       |

## Key dependencies

| Package                                | Purpose                             |
| -------------------------------------- | ----------------------------------- |
| `expo ~54.0.33`                        | Expo SDK                            |
| `expo-router ~6.0.23`                  | File-based navigation               |
| `react-native 0.81.5`                  | Core RN (new architecture enabled)  |
| `nativewind ^4.2.4`                    | Tailwind CSS for React Native       |
| `@tanstack/react-query ^5.100.10`      | Server state, caching, mutations    |
| `ts-fsrs ^5.3.2`                       | FSRS-5 spaced repetition scheduling |
| `expo-av ~16.0.8`                      | Audio playback for TTS cards        |
| `expo-haptics ~15.0.8`                 | Haptic feedback on review ratings   |
| `react-native-reanimated ~4.1.1`       | Animations                          |
| `react-native-gesture-handler ~2.28.0` | Swipeable gesture interactions      |
| `zod ^4.4.3`                           | Runtime schema validation           |

## Typography system

Three font families loaded at startup in `app/_layout.tsx`:

- **Instrument Serif** (`Display`, `Num`, `Heading`) — display text and large numbers
- **Geist** (`Body`, `Action`) — body copy and UI labels, four weights (400/500/600/700)
- **Geist Mono** (`Mono`) — eyebrow labels, stat labels, monospace data

All text primitives in `src/components/Type.tsx` are surface-aware: color resolves from the active `ThemeContext` surface (`light` | `color` | `oled` | `gold`). The rule is "text follows the surface, not the brand" — cobalt is reserved for brand-emphasis on light and OLED surfaces only.

## Theming

`src/lib/theme.ts` exports:

- `colors` — full brand ramp (cobalt, accent, semantic ratings, OLED, gender)
- `textColors` — per-surface text color maps (`light`, `gold`, `color`, `oled`)
- `textForSurface(surface, tone)` — resolves correct text color for a surface + tone pair
- `fonts` — font family name constants matching the `useFonts` map in `_layout.tsx`
- `ThemeContext` / `useTheme()` — React context for the active surface

`tailwind.config.js` mirrors the same color tokens as Tailwind classes for NativeWind usage.

## Type checking

```bash
pnpm --filter @portuguese-app/mobile typecheck
# or from this directory
npx tsc --noEmit
```

## Tests

Unit tests live alongside source files (`*.test.ts`):

- `src/lib/cardUtils.test.ts` — card filtering and due-date formatting
- `src/lib/detectKind.test.ts` — input-to-kind classification
- `src/lib/useNightSurface.test.ts` — OLED surface trigger logic (`isOledSurface`)

Run tests from the monorepo root using the workspace test command (see root `package.json`).
