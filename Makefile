.PHONY: help install dev test typecheck lint format check pre-commit \
        ingest-frequency prewarm-audio validate-prompts \
        db-generate db-migrate db-studio \
        api api-seed \
        clean

# Use Corepack so `make` works when `pnpm` is not on PATH (matches root package.json).
PNPM ?= corepack pnpm

help:
	@echo "Brazilian Portuguese Learning App — V0"
	@echo ""
	@echo "Prerequisites: Node 22.x (see .nvmrc), run: corepack enable"
	@echo ""
	@echo "Setup:"
	@echo "  make install            Install all dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev                Start mobile app in dev mode"
	@echo "  make test               Run unit + flow tests"
	@echo "  make typecheck          Run TypeScript type checker"
	@echo "  make lint               Lint code + markdown + spelling"
	@echo "  make format             Format with Prettier"
	@echo "  make check              typecheck + lint + test (CI runs this)"
	@echo ""
	@echo "API:"
	@echo "  make api                Start API server (port 3000)"
	@echo "  make api-seed           Seed the hardcoded V0 user row"
	@echo ""
	@echo "Database (requires DATABASE_URL in .env for migrate/studio):"
	@echo "  make db-generate        Generate SQL migration from schema changes"
	@echo "  make db-migrate         Apply pending migrations to Supabase DB"
	@echo "  make db-studio          Open Drizzle Studio DB browser"
	@echo ""
	@echo "Data:"
	@echo "  make ingest-frequency   Rebuild frequency list from corpus"
	@echo "  make prewarm-audio      Generate TTS for top-N words"
	@echo "  make validate-prompts   Check prompt files match schema"
	@echo ""
	@echo "Misc:"
	@echo "  make clean              Remove build artifacts"

install:
	$(PNPM) install

dev:
	cd apps/mobile && $(PNPM) dev

test:
	$(PNPM) test

typecheck:
	$(PNPM) typecheck

lint:
	$(PNPM) lint
	$(PNPM) exec markdownlint "**/*.md" --ignore node_modules --ignore CHANGELOG.md
	$(PNPM) exec cspell "**/*.{ts,tsx,md}" --no-progress

format:
	$(PNPM) exec prettier --write .

check: typecheck lint test

pre-commit:
	$(PNPM) exec lint-staged

ingest-frequency:
	$(PNPM) exec tsx scripts/ingest-frequency.ts

prewarm-audio:
	$(PNPM) exec tsx scripts/prewarm-audio-cache.ts

validate-prompts:
	$(PNPM) exec tsx scripts/validate-prompts.ts

db-generate:
	cd packages/db && $(PNPM) exec drizzle-kit generate

db-migrate:
	cd packages/db && $(PNPM) exec drizzle-kit migrate

db-studio:
	cd packages/db && $(PNPM) exec drizzle-kit studio

api:
	cd apps/api && $(PNPM) run dev

api-seed:
	cd apps/api && $(PNPM) exec tsx --env-file ../../.env src/seed.ts

clean:
	rm -rf node_modules dist build .expo coverage
	find . -name "*.tsbuildinfo" -delete
