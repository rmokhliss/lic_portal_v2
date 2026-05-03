# PROJECT_CONTEXT — s2m-lic (LIC v2)

> Lu en début de chaque session par Claude Code, avec :
>
> 1. Le **Référentiel Technique S2M v2.0** (règles transverses universelles, 25 pages)
> 2. Le **CLAUDE.md** racine du projet (extrait condensé pour Claude Code, ≤300 lignes)
> 3. Ce document — **spécifique LIC v2** (métier, périmètre, décisions, état)
>
> Mise à jour à chaque session significative. Toute évolution structurelle ajoute un ADR dans `docs/adr/`.

---

## 1. Identité du projet

| Élément          | Valeur                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | ----------- |
| Nom interne      | `s2m-lic`                                                                                                           |
| Nom commercial   | **Licence Manager**                                                                                                 |
| Code produit     | **LIC**                                                                                                             |
| Branding         | `NEXT_PUBLIC_PRODUCT_CODE=LIC`, `NEXT_PUBLIC_PRODUCT_NAME="Licence Manager"`, `NEXT_PUBLIC_PRODUCT_SUFFIX="Portal"` |
| Wordmark affiché | `SELECT-PX                                                                                                          | LIC_PORTAL` |
| Codes erreur     | `SPX-LIC-NNN` (format Référentiel §4.5)                                                                             |
| Repo cible       | https://github.com/rmokhliss/lic_portal_v2 (branche `main`)                                                         |
| Type             | **Mono-tenant** (les "clients" sont des données, pas des tenants)                                                   |
| Audience         | Équipes commerciales et finance S2M (interne)                                                                       |
| Statut           | **Projet pilote** du Référentiel S2M v2.0                                                                           |

### Métier en deux phrases

LIC est le portail back-office S2M qui pilote tout le cycle de vie commercial des licences SELECT-PX vendues aux banques africaines : du contrat signé jusqu'à la consommation réelle des modules sur F2 (le supervisor déployé chez le client), en passant par les renouvellements, les alertes de dépassement, et la traçabilité réglementaire des fichiers échangés.

C'est **le seul endroit** où S2M sait qui a droit à quoi, jusqu'à quand, à quel volume, et où en est la consommation côté client.

### Statut pilote

LIC v2 est le **premier projet** à appliquer le Référentiel S2M v2.0. Conséquences :

- Les écarts justifiés vs Référentiel sont consignés en ADR (`docs/adr/`).
- Les briques `@s2m/core-*` n'existent pas encore — implémentées **en local** dans LIC v2 (cf. section 7), elles remonteront en packages partagés une fois éprouvées.
- Toute amélioration découverte sur LIC v2 est remontée à l'équipe Référentiel.

---

## 2. État d'avancement

**Phase actuelle** : Phase 2.A close (10/10 fondations F-01 à F-12, commit `cc310e7`) + **Phase 2.A.bis — Alignement Référentiel v2.1 livrée (Mai 2026)** : ADR 0009 (Variante B), CI GitHub Actions bloquante (F-14), headers HTTP de sécurité §4.16 (F-15). **Phase 2.B en cours — étape 1/7 livrée** : schéma Drizzle des 6 tables référentiels SADMIN (`lic_regions_ref`, `lic_pays_ref`, `lic_devises_ref`, `lic_langues_ref`, `lic_types_contact_ref`, `lic_team_members`) + migration bootstrap idempotente (3 régions, 5 devises, 2 langues, 3 types contacts) + ADR 0017 (PK serial, exception bornée à ADR 0005).

**Référence amont** : LIC v1 (repo Git interne S2M, accessible sur l'organisation S2M) en production avec 11 sprints livrés, ~445 tests verts. Sert de **référence fonctionnelle** uniquement (besoins métier, écrans, workflows). LIC v2 n'est **pas une migration** : c'est un projet greenfield.

### Phase 1 — Bootstrap (prochain jalon)

1. Init monorepo pnpm (workspaces `app/` + `shared/`)
2. Stack qualité : Vitest + Playwright + ESLint+Prettier + `eslint-plugin-boundaries` + Husky + gitleaks + commitlint + release-please
3. Docker Compose local (PostgreSQL 18 + portail dev)
4. CLAUDE.md racine + sous-dossiers + Makefile (commandes Référentiel §4.10)
5. Schéma BD initial (Drizzle 0.45) avec `lic_settings`, `lic_users`, `lic_audit_log`
6. Auth.js v5 sessions + middleware
7. Layout shadcn/ui + tokens DS SELECT-PX (`@theme` Tailwind 4) + 1 page d'accueil minimale

### Phases suivantes (indicatif, à affiner par cadrage de phase)

- **Phase 2.B** : référentiels SADMIN (catalogues + équipe) + écran `/settings`
- **Phase 3** : crypto PKI (CA + certifs clients + sandbox)
- **Phase 4** : domaine clients/entités/contacts (EC-Clients)
- **Phase 5** : domaine licences (EC-02, EC-03, wizard EC-03c)
- **Phase 6** : articles + volumes (EC-04) + jobs snapshot
- **Phase 7** : audit + journal (EC-06 avec FTS)
- **Phase 8** : alertes + notifications + jobs (EC-07, EC-10)
- **Phase 9** : renouvellements (EC-11)
- **Phase 10** : fichiers (génération `.lic`, healthcheck dry-run, EC-Files)
- **Phase 11** : rapports (EC-09) + dashboard (EC-01)
- **Phase 12** : supervision batchs (EC-12) + profil (EC-14)
- **Phase 13** : durcissement, perf, déploiement

---

## 3. Stack technique

**Stack alignée Référentiel §1**, avec adaptations propres à LIC v2 (consignées en ADR).

### Imposé par le Référentiel (LIC v2 s'aligne)

- Node.js **24 LTS**, TypeScript **6.0.3** strict, ESM, target ES2025
- Next.js **16.2.4 LTS**, React **19.2**, Tailwind CSS **4.2.4 LTS**
- PostgreSQL **18.3** + Drizzle ORM **0.45.2** + Drizzle Kit
- Zod **4.3.6**, Pino **10.3.1**
- Vitest **2.1+**, Playwright **1.48+**
- ESLint + Prettier (config attendue `@s2m/eslint-config`), Husky + lint-staged + gitleaks
- shadcn/ui, TanStack Query **5.51+**, React Hook Form **7.52+**, Recharts **2.13+**
- next-intl **4.x** (FR + EN par défaut, extensible)
- Polices DS SELECT-PX via `next/font/google` : **Montserrat 800**, **Poppins 300/500**, **JetBrains Mono**

### Adaptations LIC v2 (vs Référentiel)

| Brique Référentiel                  | Choix LIC v2                                                                           | ADR      |
| ----------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| NestJS 11 backend séparé            | **Next.js full-stack single-app** (Server Actions = controllers)                       | 0001     |
| Redis 7 (locks, cache, idempotence) | **Aucun** — non nécessaire en mono-tenant                                              | implicit |
| NATS JetStream 2.10 (events)        | **Aucun** — pas de bus inter-service                                                   | implicit |
| `decimal.js` (montants)             | **Aucun** — LIC manipule des entiers de volumes (`number` validés `.int().positive()`) | implicit |
| Flyway (migrations)                 | **Drizzle Kit** — déjà l'ORM imposé                                                    | implicit |
| JWT access mémoire + refresh cookie | **Auth.js v5 sessions cookies** — interne mono-tenant                                  | implicit |
| Multi-tenant (RLS + `tenant_id`)    | **Aucun** — mono-tenant par construction                                               | implicit |
| Outbox NATS                         | **Aucun** — INSERT directs en transaction                                              | implicit |

### Spécifique LIC v2

- **pg-boss 9+** : jobs planifiés dans Postgres (pas de Redis = pas de Bull/BullMQ)
- **node-forge 1.3+** : PKI (CA auto-signée + certificats X.509 clients) — cf. ADR 0002
- **nodemailer 6.9+** + **MJML 4.15+** : emails transactionnels
- **Puppeteer** : génération PDF (rapports)
- **ExcelJS 4.4+** : génération Excel (rapports)
- **bcryptjs 2.4+** : hash mots de passe (cost 10)

---

## 4. Architecture

### Choix structurel

LIC v2 est **un seul projet** Next.js 16 qui contient frontend (App Router, Server Components) **et** backend (Server Actions, modules métier hexagonaux, jobs pg-boss dans worker séparé).

**Justification** dans `docs/adr/0001-architecture-single-app-nextjs.md`.

### Hexagonal strict (alignement Référentiel §3, §4.2, §4.11)

Le pattern `domain → application → ports → adapters` est **respecté à la lettre**. Les Server Actions Next.js remplacent les controllers NestJS du Référentiel.

| Couche Référentiel      | Équivalent LIC v2                                                     | Règle                                                                       |
| ----------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `domain/`               | `app/src/server/modules/<X>/domain/`                                  | Pure functions + entités. Aucune dépendance hors TS et types `shared/`.     |
| `application/`          | `app/src/server/modules/<X>/application/`                             | Use-cases. Orchestrent transactions + ports + audit. Pas de Drizzle direct. |
| `ports/`                | `app/src/server/modules/<X>/ports/`                                   | `abstract class` (templates §4.12.2 du Référentiel).                        |
| `adapters/postgres/`    | `app/src/server/modules/<X>/adapters/postgres/`                       | Drizzle. Aucune règle métier.                                               |
| `controllers/` (NestJS) | Server Actions Next.js dans `app/src/app/(dashboard)/<X>/_actions.ts` | Validation Zod + appel use-case + `revalidatePath`. Aucune logique métier.  |
| `shared/schemas/`       | `shared/src/schemas/` (workspace pnpm dédié)                          | Source de vérité contrats UI ↔ serveur.                                     |

### Vérifications automatiques

- **`eslint-plugin-boundaries`** (Référentiel §4.2) : casse le build si dépendance illicite
- **gitleaks** pre-commit : casse le commit si secret détecté
- **`tsc --noEmit`** + **`vitest run`** + **`playwright test`** dans CI

### Cohérence transactionnelle

- ACID **à l'intérieur** d'une transaction PostgreSQL uniquement
- Pattern : Server Action → use-case → transaction → repository writes + `auditLog.record()` → commit → `revalidatePath()`
- **Optimistic locking** sur `lic_licences` (colonne `version`) — cf. règle L4 section 6
- Pas d'outbox NATS — notifications post-mutation = INSERT directs dans `lic_notifications` même transaction

### Worker pg-boss

- Process séparé (`pnpm worker:dev`, container Docker dédié en prod)
- 5 jobs (cf. section 8.5)
- Trace dans `lic_batch_executions` + `lic_batch_logs` (UI EC-12 lit ces tables, pas pg-boss interne)

### Communication frontend ↔ backend

- **100% Server Actions** pour mutations
- **Server Components** pour lectures initiales (cache `revalidate` configurable par route)
- **TanStack Query** uniquement pour interactions client lourdes (édition inline, polling supervision, recherche live)
- **Aucun fetch direct** depuis composants — toujours via hooks `app/src/hooks/queries/`
- **Pas d'API REST publique** sauf 2 endpoints minimaux : `/api/health` et `/.well-known/s2m-ca.pem` (toggle SADMIN)

---

## 5. Structure du dépôt

Adaptation de la structure Référentiel §3 pour single-app Next.js.

```
s2m-lic/
├── package.json                pnpm workspace root
├── pnpm-workspace.yaml         ["app", "shared"]
├── tsconfig.base.json
├── .nvmrc                      24
├── .editorconfig
├── .env.example
├── Makefile                    cibles standardisées Référentiel §4.10
├── docker-compose.yml          PG 18 local
├── README.md
├── CLAUDE.md                   ≤300 lignes (Référentiel §4.19)
├── PROJECT_CONTEXT_LIC.md      Ce document
│
├── app/                        ◀ workspace Next.js (frontend + backend)
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── CLAUDE.md               règles spécifiques workspace app
│   └── src/
│       ├── app/                ◀ Next.js App Router
│       │   ├── (auth)/         /login, /forgot-password, /reset-password
│       │   ├── (dashboard)/    layout sidebar+header, 14 écrans (cf. section 8)
│       │   │   ├── clients/_actions.ts        ◀ Server Actions co-localisées
│       │   │   ├── licences/_actions.ts
│       │   │   └── ...
│       │   ├── api/health/route.ts
│       │   ├── api/.well-known/s2m-ca.pem/route.ts
│       │   ├── layout.tsx
│       │   └── globals.css     @theme tokens SELECT-PX
│       ├── server/
│       │   ├── modules/        ◀ UN DOSSIER PAR BOUNDED CONTEXT
│       │   │   └── <domain>/
│       │   │       ├── domain/         entités + règles pures + tests
│       │   │       ├── application/    use-cases + tests
│       │   │       ├── ports/          abstract classes
│       │   │       ├── adapters/postgres/
│       │   │       └── <domain>.module.ts    composition root (DI manuelle)
│       │   ├── infrastructure/
│       │   │   ├── db/         pool postgres + drizzle() + schema/ + migrations/
│       │   │   ├── auth/       Auth.js v5 + helpers requireAuth/requireRole
│       │   │   ├── logger/     Pino (Référentiel §4.2 — pas de console.log)
│       │   │   ├── env/        validation Zod variables d'env
│       │   │   └── observability/  OpenTelemetry SDK
│       │   └── jobs/           worker pg-boss (5 jobs)
│       ├── components/         ui/ (shadcn) + brand/ + domain/ + shared/
│       ├── hooks/              queries/ (TanStack) + domain/ (mapping DTO)
│       ├── lib/                couche frontend (api/, domain/, brand.ts, auth.ts)
│       └── i18n/               config + messages/{fr.json, en.json}
│
├── shared/                     ◀ workspace pnpm contrats UI ↔ serveur
│   ├── package.json
│   └── src/
│       ├── schemas/            Zod (source de vérité)
│       ├── types/              z.infer<>
│       ├── constants/          codes erreur SPX-LIC-NNN, devises
│       └── index.ts
│
├── deploy/
│   └── docker/
│
└── docs/
    ├── design/                 ◀ DS SELECT-PX local
    │   ├── index.html          tokens, brand, install
    │   └── gallery.html        8 templates de référence
    ├── adr/                    Architecture Decision Records (§9)
    ├── integration/
    │   └── F2_FORMATS.md       spec format binaire .lic + .hc + snippets
    └── architecture.md         vue d'ensemble (renvoi vers ADR)
```

**Notes** :

- Modules backend **interdits** d'avoir `services/`, `helpers/`, `utils/`, `lib/`, `common/`, `managers/` (Référentiel §4.11)
- `app/src/lib/` **autorisé** à la racine du frontend (convention Next.js standard, exception §4.11)
- CLAUDE.md à 4 niveaux : racine + `app/` + par module backend si pertinent + `docs/`

---

## 6. Règles spécifiques LIC v2

> Les **règles transverses** (no `any`, no `console.log`, hexagonal strict, audit obligatoire, validation Zod, etc.) sont dans le **Référentiel §4.2 et §4.6**. Elles ne sont pas répétées ici.
>
> Cette section liste **uniquement les règles propres à LIC v2** qui s'ajoutent au Référentiel.

| #       | Règle                                                                                                                                                          | Justification                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **L1**  | **Mono-tenant** : pas de colonne `tenant_id`, pas de RLS, pas de `@CurrentTenant()`.                                                                           | Portail interne S2M. Annule les exigences §4.2 multi-tenant du Référentiel.                               |
| **L2**  | **Volumes = entiers** : `numeric(12,0)` côté BD, `number` côté TS validé `.int().positive()` avec Zod. **Pas de `decimal.js`**.                                | LIC manipule des compteurs (TPE, GAB, porteurs), pas de monnaie. Annule l'exigence §4.2 montants Decimal. |
| **L3**  | **Audit obligatoire** : toute mutation métier appelle `auditLog.record()` dans la même transaction (entité + action + before/after JSONB + user + ip + mode).  | Réglementaire + traçabilité. Implémente §4.2 audit du Référentiel pour LIC.                               |
| **L4**  | **Optimistic locking** sur `lic_licences` via colonne `version` (incrémentée à chaque UPDATE, vérifiée par `WHERE id=? AND version=?`).                        | Modifications concurrentes par plusieurs ADMIN.                                                           |
| **L5**  | **Soft delete** sur `lic_clients`, `lic_licences`, `lic_users` : `actif = false` ou `status = INACTIF`.                                                        | Préservation historique + audit.                                                                          |
| **L6**  | **userId = `'SYSTEM'`** pour toute action déclenchée par un job.                                                                                               | Distinction MANUEL/JOB dans audit.                                                                        |
| **L7**  | **Référence licence** : format `LIC-AAAA-NNN` (compteur séquentiel par année).                                                                                 | Identifiant lisible humain.                                                                               |
| **L8**  | **Stockage UTC** (`TIMESTAMPTZ` Référentiel §4.16). **Format date UI** : JJ/MM/AAAA en FR, DD/MM/YYYY en EN. Conversion fuseau locale **frontend uniquement**. | Cohérence i18n.                                                                                           |
| **L9**  | **Affichage utilisateur** : toujours **"Prénom NOM (MAT-XXX)"**, jamais matricule seul.                                                                        | Lisibilité humaine (acquis sprint 9 N-001).                                                               |
| **L10** | **Logs Pino structurés** : champs `userRef` (matricule) + `userDisplay` (rendu UI) séparés. Pas de matricule en clair dans le message.                         | Lisibilité logs prod.                                                                                     |
| **L11** | **Permissions vérifiées côté serveur ET côté UI**, jamais uniquement UI. Server Actions valident le rôle via `requireRole()`.                                  | Sécurité.                                                                                                 |
| **L12** | **Filtres URL toujours optionnels** : helper `optionalIdFromQuery`, enums `.catch("all")`. Une valeur invalide = pas de filtre, jamais d'erreur.               | UX robuste (acquis sprint 2 R-001).                                                                       |
| **L13** | **Tokens dates virtuels safe** : `now+Nd`, `now-Nd`, `end_of_month`. Parsés côté serveur avec fallback silencieux.                                             | UX robuste (acquis sprint 2 R-007).                                                                       |
| **L14** | **Forbidden gracieux** : redirection vers `/` ou page 403, jamais crash 500. Helpers `requireAuthPage` / `requireRolePage`.                                    | UX robuste (acquis sprint 2 R-008).                                                                       |
| **L15** | **Healthcheck dry-run obligatoire** : import en 3 étapes (Upload → Preview → Confirm/Cancel). Aucune mutation BD avant confirmation explicite ADMIN+.          | Sécurité métier critique (acquis sprint 10 lot 12A).                                                      |
| **L16** | **Sandbox SADMIN sans persistance** : `/settings/sandbox` génère/déchiffre fichiers test sans écrire dans `lic_fichiers_log` ni `lic_audit_log`.               | Tests crypto sans pollution audit.                                                                        |

---

## 7. Briques `@s2m/core-*` — implémentation locale (LIC v2 pilote)

LIC v2 implémente **localement** les briques transverses Référentiel (Annexe A). Quand mature, elles seront extraites en packages npm internes.

| Brique Référentiel                       | Implémentation locale LIC v2                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@s2m/core-errors`                       | `app/src/server/modules/error/` — classes typées + codes `SPX-LIC-NNN`                           |
| `@s2m/core-audit`                        | `app/src/server/modules/audit/` — `auditLog.record()`                                            |
| `@s2m/core-observability`                | `app/src/server/infrastructure/logger/` (Pino) + `observability/` (OTel)                         |
| `@s2m/core-crypto`                       | `app/src/server/modules/crypto/` — CA + certifs X.509 + AES-GCM                                  |
| `@s2m/core-validate`                     | `shared/src/schemas/` (Zod) + helpers infrastructure                                             |
| `@s2m/core-auth`                         | `app/src/server/infrastructure/auth/` (Auth.js v5 sessions, pas JWT)                             |
| `@s2m/core-tenant`                       | **N/A** mono-tenant                                                                              |
| `@s2m/core-idempotency`                  | **N/A** phase 1, à voir si besoin futur (en table BD si oui)                                     |
| `@s2m/core-redis`, `@s2m/core-comm-nats` | **N/A**                                                                                          |
| `@s2m/select-px-design`                  | DS local dans `docs/design/` (extrait dans `@theme` Tailwind 4 + composants `components/brand/`) |

**Règle de remontée** : quand une brique est mature (utilisée 2+ fois dans LIC, API stable, tests >80%), extraction en package npm interne via PR dédiée — juste un changement d'`import`.

---

## 8. Périmètre fonctionnel

### 8.1 Hiérarchie d'entités

```
CLIENT (groupe bancaire ou institution — ex: Attijariwafa Group)
  └── ENTITE (filiale — ex: Attijariwafa Sénégal)
        └── LICENCE (contrat avec dates et version — ex: LIC-2025-001)
              ├── PRODUIT (offre commerciale — ex: SPX Acquiring Suite)
              │     └── ARTICLE (composant facturable — ex: ATM Management std, POS Server)
              │           ├── a_volume = true  → vol_contractuel + consommation suivie
              │           └── a_volume = false → simple présence/activation
              └── RENOUVELLEMENT (workflow vers une nouvelle licence)
```

### 8.2 Acteurs (3 rôles)

| Rôle       | Profil                   | Capacités                                                                                   |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| **USER**   | Commerciaux, support     | Consultation. Aucune écriture.                                                              |
| **ADMIN**  | Account Managers, Sales  | Édition métier complète sauf admin système.                                                 |
| **SADMIN** | Équipe finance/admin S2M | Tout ADMIN + valide renouvellements + paramètres système (settings, utilisateurs, sandbox). |

### 8.3 Les 14 écrans cible v2

> **Cible v2 = v1 + 7 améliorations validées** (voir ADR 0011-0016 et fonctionnel) :
> A1: EC-08 Users dans Settings · A2: EC-Files unique source vérité · B: détail licence 4 tabs · C: wizard 3 étapes · D: dashboard widgets sparkline · E: notifications drawer+page · F: renouvellements drawer · G: ADR au lieu de DEC

| #   | Route                                     | Écran                                                                                                                                                                                                   | Rôles                            |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | `/`                                       | **EC-01 Dashboard** : KPI cards + 6 widgets sparkline + alertes panel + activité récente                                                                                                                | Tous                             |
| 2   | `/clients` (+ `[id]`, `[id]/edit`, `new`) | **EC-Clients** : 5 tabs détail (Info, Entités, Contacts, Licences, Historique). Modal import healthcheck dry-run.                                                                                       | Tous (W: ADMIN+)                 |
| 3   | `/licences`                               | **EC-02 Liste licences** : filtres recherche/statut/client/entité/produit/période + export CSV. Tri défaut `date_creation DESC`.                                                                        | Tous (W: ADMIN+)                 |
| 4   | `/licences/[id]`                          | **EC-03a Détail licence** (4 tabs) : Informations (avec section Renouvellements en bas) / Articles & volumes (groupés par produit) / Fichiers (mini + lien) / Historique                                | Tous                             |
| 5   | `/licences/[id]/edit`                     | **EC-03b Édition licence** : 3 sections empilées (Infos / Produits inclus / Articles & volumes)                                                                                                         | ADMIN+                           |
| 6   | `/licences/new`                           | **EC-03c Wizard 3 étapes** : Infos générales → Produits & articles → Récapitulatif                                                                                                                      | ADMIN+                           |
| 7   | `/volumes`                                | **EC-04 Suivi articles** : Tendance ↗↘→ + Projection (date / "Dans les temps" / "Calibrage" / "Déjà dépassé") + édition inline `vol_consomme` + `seuil_alerte_pct` + modal historique LineChart 12 mois | Tous (W seuils+consommé: ADMIN+) |
| 8   | `/history`                                | **EC-06 Journal des modifications** : filtres période/client/entité/utilisateur/type/action/mode + recherche FTS française + `<JsonDiff>` langage naturel                                               | Tous                             |
| 9   | `/alerts`                                 | **EC-07 Configuration alertes** : règles par client+produit+article, multi-destinataires (Sales + AM + email_dest), test "Envoyer avec volume sample"                                                   | ADMIN+                           |
| 10  | `/notifications` (page + drawer header)   | **EC-10 Notifications** : drawer cloche header (10 dernières) + page complète historique avec filtres                                                                                                   | Tous                             |
| 11  | `/renewals` (liste + drawer édition)      | **EC-11 Renouvellements** : 4 tabs (En cours/Validés/Créés/Annulés) + drawer "Modifier les volumes" au clic                                                                                             | ADMIN+ (V: SADMIN)               |
| 12  | `/batches`                                | **EC-12 Supervision batchs** : 5 cards jobs avec switch actif/inactif (SADMIN) + drawer logs avec contexte JSONB structuré                                                                              | ADMIN+                           |
| 13  | `/files`                                  | **EC-Files Suivi fichiers** : filtres type/statut/client/licence/dates + modal détails metadata + JSON brut                                                                                             | ADMIN+                           |
| 14  | `/reports`                                | **EC-09 Rapports** : 5 rapports (Volumétrie client PDF/Excel, Expirations, Alertes, Journal, Portefeuille global Excel 3 feuilles) avec header/footer normalisés et comportement EMPTY                  | Tous                             |
| 15  | `/settings/...`                           | **EC-13 Paramétrage** (9 onglets) : general / security / smtp / catalogues / team / **users** / sandbox / demo / info                                                                                   | SADMIN                           |
| 16  | `/profile`                                | **EC-14 Profil utilisateur** : préférence langue (FR/EN), changement mot de passe, info compte                                                                                                          | Tous                             |

**Total** : 16 routes Next.js, **14 écrans logiques**.

### 8.4 Routes techniques additionnelles

| Route                                           | Type            | Auth                                                  |
| ----------------------------------------------- | --------------- | ----------------------------------------------------- |
| `/login`, `/forgot-password`, `/reset-password` | Pages publiques | Aucune                                                |
| `/api/health`                                   | Endpoint API    | Aucune                                                |
| `/.well-known/s2m-ca.pem`                       | Endpoint API    | Aucune (toggle SADMIN) — distribution clé publique CA |
| `/admin/emergency`                              | Page            | Localhost uniquement — reset SADMIN d'urgence         |

### 8.5 Jobs planifiés (pg-boss, 5 jobs)

| Job                   | Cron          | Rôle                                                                                                                       |
| --------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `expire-licences`     | `0 2 * * *`   | Statut → `EXPIRE` quand `date_fin < NOW()`                                                                                 |
| `check-alerts`        | `0 */6 * * *` | Évalue seuils par article, crée notifs + envoie emails (Sales + AM résolus depuis `lic_team_members` + `email_dest` règle) |
| `auto-renewal`        | `0 3 * * *`   | Crée dossier renouvellement à J-60 (licence `renouvellement_auto = TRUE`)                                                  |
| `snapshot-volumes`    | `0 1 1 * *`   | Snapshot mensuel `lic_article_volume_history` (articles `a_volume = TRUE`)                                                 |
| `cleanup-old-batches` | `0 4 * * 0`   | Purge `lic_batch_logs` > 90j                                                                                               |

### 8.6 Tables BD (~26 tables)

```
Référentiels SADMIN (6) :
  lic_regions_ref, lic_pays_ref, lic_devises_ref, lic_langues_ref,
  lic_types_contact_ref, lic_team_members

Catalogue commercial (2) :
  lic_produits_ref, lic_articles_ref

Métier (11) :
  lic_clients, lic_entites, lic_contacts_clients,
  lic_licences, lic_licence_produits, lic_licence_articles, lic_article_volume_history,
  lic_renouvellement, lic_alert_config, lic_notifications, lic_audit_log

Système (4) :
  lic_users, lic_settings, lic_password_reset_tokens, lic_fichiers_log

Batchs (3) :
  lic_batch_jobs, lic_batch_executions, lic_batch_logs
```

**Améliorations BD v2 vs v1** :

- **`uuidv7` PG 18** au lieu de `serial` partout (ADR 0005)
- **VIRTUAL columns** pour statuts calculés (remplace vue `v_lic_liste`)
- **`RETURNING OLD/NEW`** PG 18 dans `auditLog.record()` (-50% des SELECT préalables)
- **DETTE-001 traitée** : `user_display` + `client_display` dénormalisés dans `lic_audit_log` + inclus dans `search_vector` FTS
- **DETTE-002 traitée** : colonne `must_change_password` dans `lic_users` + flow first-login dès phase 1
- **DETTE-003 traitée** : module email opérationnel dès phase 1 (mode simulé si `SMTP_HOST` absent)
- **PKI** : `s2m_root_private_key_pem` (chiffrée AES-GCM avec `app_master_key`) + `s2m_root_certificate_pem` dans `lic_settings` ; `client_private_key_pem` (chiffrée) + `client_certificate_pem` + `client_certificate_expires_at` sur `lic_clients`

---

## 9. Décisions structurantes (ADR)

### Format

ADR au format **Michael Nygard simplifié** dans `docs/adr/NNNN-titre-court.md` :

```markdown
# NNNN — Titre

## Status

Accepted | Superseded by NNNN | Deprecated

## Context

Pourquoi cette décision

## Decision

Ce qui est décidé

## Consequences

Bonnes / mauvaises / neutres
```

### ADR fondateurs (créés en phase 1, dans `docs/adr/`)

| #        | Titre                                                                                  | Statut   |
| -------- | -------------------------------------------------------------------------------------- | -------- |
| **0001** | Architecture single-app Next.js full-stack                                             | Accepted |
| **0002** | PKI S2M : CA auto-signée + certificats clients                                         | Accepted |
| **0003** | Hiérarchie Client → Entité → Licence                                                   | Accepted |
| **0004** | Recherche audit via Postgres FTS français                                              | Accepted |
| **0005** | Identifiants `uuidv7` PG 18                                                            | Accepted |
| **0006** | Catalogue commercial Produits → Articles                                               | Accepted |
| **0007** | Seed démo : réutilisation v1                                                           | Accepted |
| **0008** | Convention nommage fichiers composants React                                           | Accepted |
| **0009** | Variante B Next.js full-stack (alignement §4.12)                                       | Accepted |
| **0017** | PK `serial` pour les 6 tables référentiels paramétrables (exception bornée à ADR 0005) | Accepted |

### ADR à créer au fil des phases (anticipé)

- 0010 : Suivi fichiers centralisé `lic_fichiers_log`
- 0011 : Détail licence à 4 tabs (refonte vs 6 tabs v1)
- 0012 : Wizard licence 3 étapes (vs 4)
- 0013 : Dashboard widgets sparkline
- 0014 : Notifications drawer + page
- 0015 : Renouvellements drawer édition
- 0016 : Utilisateurs intégrés à Settings

### Dette technique reportée

| #                                        | Dette                                                                         | Statut v2 |
| ---------------------------------------- | ----------------------------------------------------------------------------- | --------- |
| **DETTE-001** v1 (FTS audit limité)      | **Traitée d'entrée** : `user_display` + `client_display` dans `search_vector` |
| **DETTE-002** v1 (force-change-password) | **Traitée d'entrée** : `must_change_password` + flow Auth.js v5               |
| **DETTE-003** v1 (SMTP non opérationnel) | **Traitée d'entrée** : module email opérationnel + mode simulé                |

---

## 10. Dette technique LIC v2 (en cours)

Format : `DETTE-LIC-NNN — Titre court`. Une dette = limitation acceptée à corriger ultérieurement (à ne pas confondre avec un ADR qui acte une décision permanente).

À distinguer de la sous-section 9 "Dette technique reportée" qui répertorie les dettes héritées de v1 (toutes traitées d'entrée).

### Dettes ouvertes

- **DETTE-LIC-003 — `app/scripts/load-env.ts` throw `ENOENT` si `app/.env` absent** : `process.loadEnvFile(".env")` (Node 21.7+) crashe quand le fichier est absent, alors que les variables peuvent déjà être présentes dans `process.env`. Le loader devrait être permissif dans ce cas. **Priorité** : moyenne. **Workaround actuel** : générer un `app/.env` (peuplé depuis le job `env:` block) en step CI avant `pnpm db:migrate` (cf. `.github/workflows/ci.yml`). À traiter Phase 2.B+.
- **DETTE-LIC-004 — CSP avec `'unsafe-inline'` + `'unsafe-eval'`** : la CSP appliquée en F-15 (`app/next.config.ts`) autorise `'unsafe-inline'` (scripts + styles) et `'unsafe-eval'` (Turbopack dev). Le durcissement vers une CSP nonce-based requiert la réintroduction d'un middleware Next.js (régression vs F-12 qui l'a justement supprimé). Le retrait conditionnel de `'unsafe-eval'` en prod (uniquement requis par Turbopack en dev) est inclus dans cette dette. **Priorité** : basse. **Phase** : 13 (durcissement sécurité prod).

### Dettes résolues

- **DETTE-LIC-001 — OpenTelemetry Web non installé en Phase 1** → **Résolue F-10** (`@opentelemetry/api` + `sdk-trace-web` installés, `OtelProvider` actif côté client, propagation `traceparent` opérationnelle).
- **DETTE-LIC-002 — `middleware.ts` deprecated Next.js 16** → **Sans objet (F-12)** (le middleware a été supprimé entièrement, le check auth est passé dans `(dashboard)/layout.tsx`, la dépréciation `middleware → proxy` ne s'applique plus).

---

## 11. Design system SELECT-PX (alignement Référentiel §4.4)

### Source locale

- **`docs/design/index.html`** : tokens, brand, install, references
- **`docs/design/gallery.html`** : 8 templates de référence (dashboard, liste, détail, etc.)

> **Règle Référentiel §4.4** : pas d'invention visuelle. Toute couleur/taille/radius/ombre/composant vient du DS. En cas de doute : lire `docs/design/index.html` sections 03 (tokens), 14 (stack), 15 (install).

### Tokens à intégrer en `@theme` Tailwind 4 (`globals.css`)

```css
@theme {
  /* Marque SELECT-PX */
  --color-spx-cyan-100: #74ecff;
  --color-spx-cyan-500: #00caff;
  --color-spx-blue-600: #0066d6;
  --color-spx-blue-900: #0006a5;
  --color-spx-ink: #3f3f3e;

  /* Surfaces sombres (sidebar, header) */
  --color-surface-0: #0b0d12;
  --color-surface-1: #11141b;
  --color-surface-2: #1a1f2b;
  --color-border-subtle: #242a38;

  /* Sémantique */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  /* Typo */
  --font-display: "Montserrat", "Helvetica Neue", sans-serif; /* 800 */
  --font-sans: "Poppins", system-ui, sans-serif; /* 300/500 */
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Radii */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Gradient signature */
  --gradient-spx: linear-gradient(90deg, #74ecff 0%, #00caff 55%, #0006a5 100%);
}
```

### Composants Brand (à dériver dans `app/src/components/brand/`)

- **`<BrandLockup />`** : tile sombre + chevron X + wordmark `SELECT-PX | LIC_PORTAL`
- **`<SpxTile />`** : tile sombre seule (pour favicon, splash)

### Polices via `next/font/google` (Référentiel §4.4)

```ts
import { Montserrat, Poppins, JetBrains_Mono } from "next/font/google";
const display = Montserrat({ weight: "800", subsets: ["latin"] });
const sans = Poppins({ weight: ["300", "500"], subsets: ["latin"] });
const mono = JetBrains_Mono({ subsets: ["latin"] });
```

### Layout sidebar sombre (acquis sprint 10)

- Sidebar `surface-0` avec logo `/logos/logo-white.svg`
- Items filtrés par rôle au rendu
- 4 groupes : **Gestion** (Tableau de bord, Clients, Licences, Articles, Renouvellements) / **Surveillance** (Alertes ADMIN+, Notifications) / **Rapports** (Rapports, Fichiers ADMIN+) / **Système** (Journal, Batchs ADMIN+)
- **Paramétrage** isolé en bas (SADMIN) — incluant Utilisateurs comme onglet (amélioration A1)

### shadcn/ui customisé

Installation : `pnpm dlx shadcn@latest add button input badge table card dialog tabs sheet drawer`. Customisation via overrides locaux qui appliquent les tokens du DS.

---

## 12. Workflow Claude Code

### En début de session

Conformément Référentiel §4.1 :

1. Lire `CLAUDE.md` racine
2. Lire `app/CLAUDE.md` (workspace concerné)
3. Lire `PROJECT_CONTEXT_LIC.md` (ce document)
4. Lire le ou les `CLAUDE.md` du module concerné si présent
5. Scanner module voisin pour patterns en place
6. **N/A pour LIC v2 phase 1** : chercher dans `@s2m/core-*` et `@s2m/monetique-*` (Annexe A Référentiel) — les packages n'existent pas encore, donc voir section 7 ci-dessus.

### Workflow d'une tâche

Adapté du Référentiel §4.9 :

1. Identifier le module concerné (`app/src/server/modules/<X>/`)
2. Scanner code voisin pour patterns
3. **Étendre `shared/src/schemas/`** si contrat API impacté
4. Implémenter en respectant l'hexagonal (templates §4.12 du Référentiel)
5. Écrire tests Vitest (`domain/__tests__/`, `application/__tests__/`) — couverture ≥80%
6. Ajouter Server Action dans `app/src/app/(dashboard)/<X>/_actions.ts` si UI impactée
7. Si schéma BD : créer migration via `pnpm db:generate`
8. `make lint` (typecheck + boundaries + gitleaks) doit passer
9. Mettre à jour `PROJECT_CONTEXT_LIC.md` si décision structurelle ou changement de phase
10. Si nouvelle décision structurante : ajouter ADR

### Commandes unifiées (Référentiel §4.10)

| Commande       | Effet                                    |
| -------------- | ---------------------------------------- |
| `make dev`     | Démarre app + worker + datastores Docker |
| `make test`    | Tests unitaires + intégration + E2E      |
| `make build`   | Build production tous workspaces         |
| `make lint`    | Lint + typecheck + boundaries + gitleaks |
| `make migrate` | Applique migrations Drizzle Kit          |
| `make clean`   | Nettoie builds + arrête conteneurs       |

### Ce qu'il NE FAUT PAS faire (rappel)

- Pas de procédures stockées Postgres (logique en TypeScript)
- Pas de `useEffect` pour fetch (Server Components ou TanStack Query)
- Pas de mutations directes en composant client (Server Actions)
- Pas de CSS inline ni CSS modules (Tailwind only)
- Pas de bibliothèque UI lourde (shadcn/ui only)
- Pas de gestion d'état globale sans justification
- Pas de secret en dur (`process.env.X` validé via `infrastructure/env/`)

---

## 13. Glossaire métier

| Terme                           | Définition                                                                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SELECT-PX** (SPX)             | Marque parente S2M des produits monétiques. Vendu sous forme de suites commerciales.                                                                                                                |
| **F2**                          | Supervisor logiciel S2M déployé chez chaque client (banque). Lit le fichier `.lic`, applique les volumes contractuels, génère les healthchecks de remontée.                                         |
| **Fichier de licence (`.lic`)** | Fichier généré par LIC, signé RSA-SHA256 avec la clé privée du client (signée elle-même par CA S2M). Contient le payload contractuel JSON v2. F2 le vérifie avec la clé publique CA (cf. ADR 0002). |
| **Healthcheck (`.hc`)**         | Fichier généré par F2 chiffré AES-256-GCM avec clé partagée. Contient les volumes consommés actuels. Importé par LIC en mode dry-run obligatoire (cf. règle L15).                                   |
| **CA S2M**                      | Autorité de certification interne S2M, auto-signée. Signe les certificats clients. Sa clé publique est distribuée à tous les F2.                                                                    |
| **Article `a_volume = true`**   | Article facturable avec quota contractuel (ex: nb GAB, nb porteurs). Suivi en consommation.                                                                                                         |
| **Article `a_volume = false`**  | Article de simple présence/activation (ex: module activé ou pas). Pas de suivi numérique.                                                                                                           |
| **Tendance**                    | Indicateur ↗↘→ d'évolution de consommation sur 3 derniers mois (DEC-004 v1, calcul `computeArticleTrend`).                                                                                          |
| **Projection**                  | Date estimée de dépassement contractuel projetée à partir de la tendance. Affiche aussi "Dans les temps" / "Calibrage" / "Déjà dépassé".                                                            |
| **Dossier de renouvellement**   | Workflow 5 étapes vers une nouvelle licence : Création → Modification volumes → Validation SADMIN → Création licence cible → Génération fichier.                                                    |
| **DEC-NNN**                     | Décisions historiques v1 (LIC_PORTAL ancien). Remplacées en v2 par des **ADR** (cf. section 9).                                                                                                     |
| **ADR**                         | Architecture Decision Record. Format Michael Nygard. Une décision = un fichier markdown autonome dans `docs/adr/`.                                                                                  |
| **ECxx**                        | Identifiant historique d'écran v1 (EC-01 = Dashboard, etc.). Conservé en v2 pour cohérence avec la base de connaissances.                                                                           |
| **SSV6**                        | Ancienne version SELECT-PX. Articles dupliqués `_SPX` / `_V6` quand les volumes diffèrent entre versions chez un même client.                                                                       |
| **Sandbox SADMIN**              | Page `/settings/sandbox` permettant de tester les fonctions crypto end-to-end sans aucune écriture en BD (cf. règle L16).                                                                           |

---

## 14. Sources de vérité et références

| Source                             | Emplacement                                             | Rôle                                                                        |
| ---------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Référentiel Technique S2M v2.0** | `docs/REFERENTIEL_S2M.pdf` (à copier dans le repo)      | Règles transverses universelles, 25 pages                                   |
| **CLAUDE.md** racine               | `/CLAUDE.md`                                            | ≤300 lignes, lu en début de session par Claude Code                         |
| **Ce document**                    | `/PROJECT_CONTEXT_LIC.md`                               | État spécifique LIC v2 (cadrage + périmètre)                                |
| **ADR fondateurs**                 | `docs/adr/0001-*.md` à `0006-*.md`                      | Décisions structurantes                                                     |
| **Design system**                  | `docs/design/index.html` + `gallery.html`               | Tokens + 8 templates (DS local)                                             |
| **Spec format F2**                 | `docs/integration/F2_FORMATS.md`                        | Spec binaire `.lic` + `.hc` + snippets Node.js / Web Crypto                 |
| **Architecture**                   | `docs/architecture.md`                                  | Vue d'ensemble (renvoi vers ADR)                                            |
| **CLAUDE.md** workspace            | `app/CLAUDE.md`, `app/src/server/modules/<X>/CLAUDE.md` | Règles locales par workspace/module                                         |
| **Référence v1**                   | Repo Git interne S2M (lecture seule)                    | Référence fonctionnelle (besoins, écrans, workflows). Pas de copie de code. |
