<!-- generated-by: gsd-doc-writer -->

# Getting Started

This guide walks you through cloning the repo, installing dependencies, configuring secrets, and running the API server and mobile app together for the first time.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js 22.x** — the repo pins `22` in `.nvmrc`. Run `nvm use` (nvm) or `fnm install && fnm use` (fnm) from the repo root to switch automatically.
- **pnpm 11** — the repo uses `pnpm@11.1.2` via Corepack. Enable Corepack once with:

  ```bash
  corepack enable
  ```

  Corepack will then resolve the exact pnpm version declared in `package.json` without a separate global install.

- **Expo Go** — install on your iOS or Android device from the App Store or Google Play Store. You will use it to load the mobile app over your local Wi-Fi network.
- **PostgreSQL database** — the API requires a live Postgres connection at startup. A free [Supabase](https://supabase.com) project is the intended host (see `.env.example`). Any Postgres host works as long as you have a valid connection URI.

## Installation

**1. Clone the repository.**

```bash
git clone https://github.com/g-strick/Consono.git
cd Consono
```

**2. Install all workspace dependencies.**

```bash
make install
# equivalent: corepack pnpm install
```

**3. Approve build scripts (one-time interactive step).**

Some native dependencies (like `esbuild`) require their build scripts to be explicitly approved by pnpm. Run this once after a fresh install:

```bash
corepack pnpm approve-builds
```

Follow the interactive prompts to approve the listed packages.

## Environment Setup

**4. Copy the example env file.**

```bash
cp .env.example .env
```

**5. Fill in your secrets.**

Open `.env` and set the following values:

| Variable             | Where to get it                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`       | Supabase → Project Settings → Database → Connection string (URI, Transaction mode **off**) |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys)                                           |
| `NARAKEET_API_KEY`   | [narakeet.com](https://www.narakeet.com) account settings                                  |
| `PEXELS_API_KEY`     | [pexels.com/api](https://www.pexels.com/api)                                               |

`DATABASE_URL` is the only variable that causes an immediate startup failure if missing. The other three API keys only throw when their respective routes are called, so the server starts without them — but card generation and audio will fail at runtime.

`NARAKEET_VOICE_ID` is included in the copied `.env.example` (set to `felipe`) and is safe to leave as-is or remove entirely — the variable has no runtime effect because the voice is hardcoded to `felipe` in the source.

**6. Seed the database (first time only).**

After applying migrations, seed the hardcoded V0 user row:

```bash
make db-migrate   # apply pending migrations to your Supabase DB
make api-seed     # insert the V0 user row
```

## Running the App

You need two terminals running simultaneously — one for the API server, one for the Expo bundler.

**Terminal 1 — API server:**

```bash
make api
# equivalent: cd apps/api && corepack pnpm run dev
# Server starts on http://localhost:3000
```

Verify the server is up:

```bash
curl http://localhost:3000/health
# Expected: {"ok":true}
```

**Terminal 2 — Expo / Metro bundler:**

```bash
make mobile
# equivalent: cd apps/mobile && corepack pnpm start
```

Metro will print a QR code in the terminal and display the local bundle URL.

In development, the mobile app auto-resolves the API server's LAN IP from Expo's `hostUri` — you do not need to set `EXPO_PUBLIC_API_URL` for local development. The app reads the host portion of Expo's `hostUri` (e.g. `192.168.1.5`) and appends `:3000` automatically, which avoids the `localhost`-doesn't-work-on-device problem.

If you need to override the API URL (for example, to point at a staging server), set `EXPO_PUBLIC_API_URL` before starting Metro:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.42:3000 make mobile
```

## First Use on Device

1. Open **Expo Go** on your phone.
2. Tap **Scan QR Code**.
3. Scan the QR code printed by Metro in Terminal 2.
4. The Consono app loads on your device. The home screen shows cards due for review.

Your phone and development machine must be on the same Wi-Fi network. The auto-resolved LAN IP handles routing — no manual URL configuration is needed.

## Common Setup Issues

**`DATABASE_URL is not set` — API crashes immediately**

The API process exits before serving any requests if `DATABASE_URL` is missing or empty. Verify your `.env` file exists in the repo root (not inside `apps/api/`) and contains a valid `DATABASE_URL`.

**Phone cannot reach the API (`Network request failed`)**

The LAN IP auto-resolution relies on Expo's `hostUri`. If your phone and machine are on different networks or the auto-resolved IP is wrong, override it explicitly:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.42:3000 make mobile
```

Find your machine's LAN IP with `ifconfig | grep 'inet '` (macOS/Linux). Do not use `localhost` or `127.0.0.1`.

**`pnpm: command not found` when running `make`**

The Makefile uses `corepack pnpm` internally, so pnpm does not need to be on your PATH — but Corepack does. Run `corepack enable` first, then retry.

### Wrong Node version (Corepack or native module errors)

Run `nvm use` or `fnm use` from the repo root. The `.nvmrc` file pins `22`. Installing dependencies with an incompatible Node version can leave corrupted native binaries in `node_modules`; run `make clean && make install` to rebuild from scratch.

## Next Steps

- **Environment variables** — see `docs/guides/configuration.md` for all environment variables and config files.
- **Architecture** — see `docs/architecture/overview.md` for how the API, mobile app, and database fit together.
- **Make targets** — run `make help` for a full list of available commands (tests, type checking, linting, database commands).
