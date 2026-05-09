.PHONY: help install dev test typecheck lint format check pre-commit \
        ingest-frequency prewarm-audio validate-prompts \
        clean

help:
	@echo "Brazilian Portuguese Learning App — V0"
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
	@echo "Data:"
	@echo "  make ingest-frequency   Rebuild frequency list from corpus"
	@echo "  make prewarm-audio      Generate TTS for top-N words"
	@echo "  make validate-prompts   Check prompt files match schema"
	@echo ""
	@echo "Misc:"
	@echo "  make clean              Remove build artifacts"

install:
	pnpm install

dev:
	cd apps/mobile && pnpm dev

test:
	pnpm test

typecheck:
	pnpm typecheck

lint:
	pnpm lint
	pnpm exec markdownlint "**/*.md" --ignore node_modules --ignore CHANGELOG.md
	pnpm exec cspell "**/*.{ts,tsx,md}" --no-progress

format:
	pnpm exec prettier --write .

check: typecheck lint test

pre-commit:
	pnpm exec lint-staged

ingest-frequency:
	pnpm exec tsx scripts/ingest-frequency.ts

prewarm-audio:
	pnpm exec tsx scripts/prewarm-audio-cache.ts

validate-prompts:
	pnpm exec tsx scripts/validate-prompts.ts

clean:
	rm -rf node_modules dist build .expo coverage
	find . -name "*.tsbuildinfo" -delete
