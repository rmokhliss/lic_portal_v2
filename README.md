# s2m-lic — Licence Manager (LIC v2)

Portail back-office S2M de gestion des licences contractuelles **SELECT-PX**.

> **Projet pilote du Référentiel Technique S2M v2.0**
> Voir `docs/REFERENTIEL_S2M.pdf`, `PROJECT_CONTEXT_LIC.md` et `CLAUDE.md`.

---

## Stack

- **Node.js 24 LTS** + **TypeScript 6** strict + **pnpm 9**
- **Next.js 16** full-stack (App Router + Server Actions)
- **PostgreSQL 18** + **Drizzle ORM 0.45** + **uuidv7**
- **Auth.js v5** sessions cookies
- **pg-boss** pour les jobs planifiés (pas de Redis)
- **Tailwind 4** + **shadcn/ui** + DS SELECT-PX local
- **Vitest** + **Playwright**

---

## Démarrage rapide

### Prérequis
- Node.js 24+ (via [nvm](https://github.com/nvm-sh/nvm) : `nvm use`)
- pnpm 9+ (`npm install -g pnpm`)
- Docker Desktop (pour PostgreSQL local)

### Installation
```bash
# Cloner le repo
git clone <url> lic-portal-v2
cd lic-portal-v2

# Configurer l'environnement
cp .env.example .env
# Éditer .env : générer AUTH_SECRET et APP_MASTER_KEY
#   openssl rand -base64 32

# Installer les dépendances
pnpm install

# Démarrer Postgres en Docker
docker compose up -d postgres

# Appliquer les migrations
pnpm db:migrate

# Charger les données de démo (optionnel)
pnpm db:seed

# Lancer l'app en dev (Next.js + worker pg-boss en parallèle)
pnpm dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

---

## Commandes principales

| Commande | Effet |
|---|---|
| `pnpm dev` | App Next.js en dev |
| `pnpm worker:dev` | Worker pg-boss (jobs planifiés) |
| `pnpm test` | Tests unitaires + intégration |
| `pnpm test:e2e` | Tests E2E Playwright |
| `pnpm lint` | Lint + typecheck + boundaries |
| `pnpm build` | Build production |
| `pnpm db:studio` | Drizzle Studio (UI BD) |
| `pnpm db:reset` | Drop + migrate + seed (DEV) |

Équivalents `make` (Référentiel §4.10) : `make dev`, `make test`, `make build`, `make lint`, `make migrate`, `make clean`.

---

## Documentation

| Document | Contenu |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Règles condensées Claude Code (≤300 lignes) |
| [`PROJECT_CONTEXT_LIC.md`](./PROJECT_CONTEXT_LIC.md) | État projet, périmètre, écrans, ADR |
| [`docs/REFERENTIEL_S2M.pdf`](./docs/REFERENTIEL_S2M.pdf) | Référentiel Technique S2M v2.0 (règles transverses) |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Records |
| [`docs/design/index.html`](./docs/design/index.html) | Design system SELECT-PX (tokens, brand) |
| [`docs/design/gallery.html`](./docs/design/gallery.html) | 8 templates de référence |

---

## Structure

```
s2m-lic/
├── app/        Next.js full-stack (frontend + backend hexagonal)
├── shared/     Schémas Zod partagés UI ↔ serveur
├── docs/       Référentiel + ADR + DS + integration F2
└── deploy/     Docker prod + manifestes
```

Voir `PROJECT_CONTEXT_LIC.md` section 5 pour le détail.

---

## Conformité

- **Hexagonal strict** : `domain → application → ports → adapters` (vérifié par `eslint-plugin-boundaries`)
- **Audit obligatoire** sur toute mutation métier (Référentiel §4.2)
- **TypeScript 6 strict** sans `any`
- **Pino** pour les logs structurés (pas de `console.log`)
- **Zod** sur toutes les frontières UI ↔ serveur
- **gitleaks** au pre-commit (pas de secret en dépôt)

---

## Statut

**Phase 0 — Cadrage terminé** (Avril 2026).
**Phase 1 — Bootstrap** : en cours.

Voir `PROJECT_CONTEXT_LIC.md` section 2 pour le plan complet (13 phases).

---

## Contact

Équipe S2M Maroc — Casablanca.
