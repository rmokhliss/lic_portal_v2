# ==============================================================================
# LIC v2 — Makefile (Référentiel S2M v2.0 §4.10)
# ==============================================================================
#
# Cibles standardisées :
#   make dev      → app + worker + Docker (PG)
#   make test     → tests unitaires + E2E
#   make build    → build prod tous workspaces
#   make lint     → lint + typecheck + boundaries + gitleaks
#   make migrate  → Drizzle Kit migrate
#   make clean    → nettoie builds + arrête conteneurs
#
# Note Windows : pour exécuter `make`, installer GNU Make
#   - via Chocolatey  : choco install make
#   - via Scoop       : scoop install make
#   - via winget      : winget install GnuWin32.Make
# Alternative pure-pnpm : utiliser directement les scripts package.json
#   (ex: `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm lint`, etc.)
# ==============================================================================

.PHONY: help dev worker test test-unit test-e2e build lint typecheck format \
        migrate db-generate db-seed db-studio db-reset clean docker-up \
        docker-down docker-logs install gitleaks ci

# Cible par défaut : afficher l'aide
help:
	@echo "Usage : make <target>"
	@echo ""
	@echo "Démarrage :"
	@echo "  install        Installer les dépendances (pnpm install)"
	@echo "  dev            Démarrer app + worker + Postgres Docker"
	@echo "  worker         Démarrer uniquement le worker pg-boss"
	@echo ""
	@echo "Tests :"
	@echo "  test           Tous les tests (unit + E2E)"
	@echo "  test-unit      Tests unitaires Vitest"
	@echo "  test-e2e       Tests E2E Playwright"
	@echo ""
	@echo "Qualité :"
	@echo "  lint           Lint + typecheck + boundaries + gitleaks"
	@echo "  typecheck      Vérification TypeScript"
	@echo "  format         Formatter Prettier"
	@echo "  gitleaks       Scan secrets dans diffs"
	@echo ""
	@echo "Base de données :"
	@echo "  migrate        Appliquer les migrations Drizzle"
	@echo "  db-generate    Générer une nouvelle migration"
	@echo "  db-seed        Charger les données de démo"
	@echo "  db-studio      Ouvrir Drizzle Studio"
	@echo "  db-reset       Drop + migrate + seed (DEV UNIQUEMENT)"
	@echo ""
	@echo "Build / Docker :"
	@echo "  build          Build production"
	@echo "  docker-up      Démarrer Postgres en Docker"
	@echo "  docker-down    Arrêter Postgres Docker"
	@echo "  docker-logs    Logs Docker"
	@echo "  clean          Nettoyer builds + arrêter conteneurs"
	@echo ""
	@echo "CI :"
	@echo "  ci             Pipeline complète (lint + typecheck + tests + build)"

# --- Installation -------------------------------------------------------------
install:
	pnpm install

# --- Dev ----------------------------------------------------------------------
dev: docker-up
	pnpm dev

worker:
	pnpm worker:dev

# --- Tests --------------------------------------------------------------------
test: test-unit test-e2e

test-unit:
	pnpm test

test-e2e:
	pnpm test:e2e

# --- Qualité ------------------------------------------------------------------
lint: typecheck gitleaks
	pnpm lint

typecheck:
	pnpm typecheck

format:
	pnpm format

gitleaks:
	@echo ">> Scan gitleaks (secrets)"
	@if command -v gitleaks >/dev/null 2>&1; then \
		gitleaks detect --source . --verbose --redact; \
	else \
		echo "  ⚠  gitleaks non installé — voir https://github.com/gitleaks/gitleaks"; \
	fi

# --- Base de données ----------------------------------------------------------
migrate:
	pnpm db:migrate

db-generate:
	pnpm db:generate

db-seed:
	pnpm db:seed

db-studio:
	pnpm db:studio

db-reset:
	pnpm db:reset

# --- Build & Docker -----------------------------------------------------------
build:
	pnpm build

docker-up:
	docker compose up -d postgres

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

clean: docker-down
	rm -rf node_modules app/node_modules shared/node_modules
	rm -rf app/.next app/dist shared/dist
	rm -rf coverage app/coverage shared/coverage
	rm -rf playwright-report app/playwright-report
	rm -rf .turbo .swc app/.turbo app/.swc
	@echo ">> Nettoyé"

# --- CI -----------------------------------------------------------------------
ci: install lint test build
	@echo ">> Pipeline CI OK"
