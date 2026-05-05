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

**Phase actuelle** : **Phases 1 → 13 closes + Phase 3 PKI (Mai 2026)** — back-office complet livré + durcissement sécurité prod + brique PKI. MVP livré, prêt pour premier déploiement préprod.

**Phase 3 PKI close (Mai 2026)** — module crypto + CA + cert clients + sandbox + endpoint public.

- 3.A.1 (commits `c6a8f59`, `a1477ff`) : retrait node-forge + module crypto/domain/rsa.ts (RSA-4096 + RSASSA-PKCS1-v1_5 RFC8017) + 21 tests + vecteur de non-régression. ADR-0019.
- 3.A.2 (commits `c178a8a`, `07c75a9`) : aes.ts (AES-256-GCM NIST SP800-38D) + x509.ts (CA + client cert generation via @peculiar/x509, vérification sync via node:crypto.X509Certificate). 41 tests crypto.
- 3.B : migration 0010 — 3 colonnes PKI nullable sur `lic_clients` (`client_private_key_enc`, `client_certificate_pem`, `client_certificate_expires_at`) + index `idx_clients_cert_expires_at`.
- 3.E.0 : migration 0011 — ALTER TYPE audit_mode ADD VALUE 'SCRIPT' pour backfill + scripts pnpm one-shot.
- 3.C : `generateCAUseCase` + `getCAStatusUseCase` + `getCACertificateUseCase` câblés cross-module (settingRepository + auditRepository + userRepository) + UI `/settings/security` (statut CA, génération SADMIN, téléchargement `s2m-ca.pem`). CA persistée en JSONB unique sous clé `s2m_root_ca`.
- 3.D : refactor `createClientUseCase` — vérif CA présente AVANT tx (throw SPX-LIC-411 si absente), génération paire RSA-4096 client + cert X.509 signé par CA + chiffrement AES-GCM clé privée + INSERT cert dans même tx que client + audit `CERTIFICATE_ISSUED`. Constructor avec `settingRepository?` optional pour rétrocompat tests legacy.
- 3.E : `backfillClientCertificatesUseCase` itère clients sans cert, génère cert pour chacun (audit mode SCRIPT). Script CLI `pnpm script:backfill-client-certs`. UI section dans `/settings/security`.
- 3.F : Sandbox `/settings/sandbox` opérationnelle — 5 outils SADMIN (génération paire RSA, signature .lic, vérification, chiffrement .hc, déchiffrement) — règle L16 respectée (ZÉRO écriture BD, tout en mémoire).
- 3.G : route `/.well-known/s2m-ca.pem` (404 silencieux par défaut, 200 + PEM si setting `expose_s2m_ca_public=true`). Toggle SADMIN. Var d'env `EXPOSE_S2M_CA_PUBLIC` supprimée → setting BD single source of truth.
- 3.H : ADR-0019 (RSA-4096, node:crypto natif, @peculiar/x509 exception, PKCS1-v1_5, validity 20/10 ans, AES-GCM, toggle BD, audit_mode SCRIPT). DETTE-LIC-008 résolue.

**Phases 1 → 13 closes (Mai 2026)** — back-office complet livré + durcissement sécurité prod.

**Phase 13 close (Mai 2026)** — durcissement sécurité, perf, déploiement, doc finale.

- 13.A — sécurité prod : rate limit helper in-memory (`infrastructure/rate-limit/`) appliqué à `change-password` (5/min/user) et `reset-password` (10/min/admin), code SPX-LIC-904 — commit `d74154d`. CSP **Variante A+nonces** production-only via `app/src/proxy.ts` Next.js 16 (NODE_ENV !== 'production' guard) + ADR 0018, **DETTE-LIC-004 résolue** — commit `2b8fc3c`. Headers F-15 conservés (HSTS, X-Frame-Options DENY, etc.).
- 13.B — perf : 64 indexes BD validés (couverture lectures FTS audit + rapports + dashboard), build green, `/api/health` opérationnel — pas de modif Phase 13.
- 13.C — dettes : `BUILD_SHA` injecté en CI (`.github/workflows/ci.yml`), DETTE-LIC-007 résolue. Test `toggle-type-contact.usecase.int.spec.ts` refactor TRUNCATE+reseed (R-32) pour fixer la flakiness cross-files (la table bootstrap `lic_types_contact_ref` était TRUNCATEd par d'autres specs CASCADE) — commit `7f4d27c`.
- 13.D — doc : `README.md` statut final phases 1-12 puis 1-13 — commits `a4a7297` + commit final cloture.
- 13.E — déploiement : `Dockerfile` multi-stage (base/deps/builder/runner-app/runner-worker, non-root uid 1001, ARG BUILD_SHA, healthcheck `/api/health`) + `.env.example` enrichi (section BUILD_SHA) — fichiers livrés, test build container reporté à la step préprod.

**Phases 11+12 closes (Mai 2026)** — Dashboard EC-01 + Rapports EC-09 + Profil EC-14.

- 11.A (commit `50e0245`) : module dashboard (port + adapter + use-case agrégats SQL) + page `/` avec 5 KPI cards + 4 graphiques recharts + 2 tableaux rapides
- 11.B (commit `bfa3a8c`) : page `/reports` ADMIN/SADMIN + 3 exports CSV (licences, renouvellements, audit) cap 100k lignes via SPX-LIC-755
- 11.C (commit `5c9ee9b`) : nav-routes nettoyé (4 routes orphelines retirées) + breadcrumbs dynamiques `/clients/[id]/*` et `/licences/[id]/*` (DETTE-LIC-009 partielle)
- 12.A (commit `1ae5597`) : page `/profile` (infos user + lien change-password + warning mustChange)
- 12.B : flow force-change-password déjà opérationnel depuis Phase 2.A (`requireAuthPage` redirige vers `/change-password` si `mustChangePassword=true`)

**Phase 6 Catalogue + Volumes close (Mai 2026)** — 5 modules hexagonaux (produit, article, licence-produit, licence-article, volume-history) + UI tab articles licence + onglet catalogues settings + seed démo.

- 6.A (commit `46cbe5c`) : 5 schémas Drizzle + migration 0007 (10 indexes + 5 FKs + 4 CHECK volumes ≥0 + 4 UNIQUE)
- 6.B (commit `4bfeb3e`) : modules produit + article (PK serial ADR 0017, R-27 sans audit), 10 use-cases, 43 tests
- 6.C (commit `d958bc3`) : modules licence-produit + licence-article (audit transactionnel L3), Add/UpdateVolume/Remove
- 6.D (commit `0fe715e`) : module volume-history append-only avec cursor pagination + R-35 isUniqueViolation
- 6.E (commit `bc81e98`) : seed démo (5 produits + 15 articles + 20 licences attachées + 60 snapshots, idempotent SEED)
- 6.F (commit `c5466a3`) : UI tab `/licences/[id]/articles` + onglet `/settings/catalogues` + 11 Server Actions + i18n FR/EN

**Phase 5 Licences close** (commits `e348406` → `69610af`) : 2 modules + 4 tabs détail + seed 55 licences.

**Phase 4 EC-Clients close** (commits `b5906c4` → `f2c273e`) : 3 modules + UI liste/détail + seed 55 clients.

**Phase actuelle précédente** : **Phase 2.B + Phase 2.B.bis EC-08 Users complètes (Mai 2026)** — écran EC-13 Paramétrage opérationnel (4 onglets réels + 5 PhaseStub), 462/462 tests verts.

- Étape 1/7 : 6 schémas Drizzle référentiels SADMIN + migration bootstrap idempotente + **ADR 0017** (PK serial, exception bornée à ADR 0005).
- Étapes 2-4/7 : 6 modules hexagonaux complets (regions, pays, devises, langues, types-contact, team-members) — 30 use-cases, exclus de l'audit obligatoire (R-27, ADR 0017).
- Étape 5/7 (commit `5ab9392`) : composition-root cross-module + script `pnpm db:seed` enrichi (8 régions, 31 pays, 15 devises, 5 langues, 6 types contact, 6 team members, 5 users BO, 9 settings — DEV-only) + R-29 (isolation seed vs tests).
- Étape 6/7 (commit `73edc08`) : layout `/settings` + 9 onglets (3 réels + 6 PhaseStub) + i18n FR/EN + R-30 (Tabs shadcn asChild+Link).
- Étape 7/7 (commit `95496c8` + fix `6e148be`) : module settings hexagonal + onglets general/team/info opérationnels + 13 Server Actions SADMIN + R-31 (DTOs app-route dupliqués).
- **Phase 2.B.bis EC-08 Users (commit `b51195a`)** : module user hexagonal complété (domain/entity/errors/password + 5 use-cases list/create/update/toggle/reset + mapper) + 15 tests (TRUNCATE+reseed pattern R-28) + UI `/settings/users` réel (SettingsUsersTable + UserDialog + PasswordRevealDialog verrouillé Radix + ConfirmResetPasswordDialog) + 4 Server Actions SADMIN + log Pino `user_password_to_communicate` + codes SPX-LIC-720..723 + audit USER\_\* (CREATED/UPDATED/ROLE_CHANGED/ACTIVATED/DEACTIVATED/PASSWORD_RESET_BY_ADMIN). Onglet `users` retiré des stubs : 5 PhaseStub restants (security, smtp, catalogues, sandbox, demo).

**Phase 2.A close** : 10/10 fondations F-01 à F-12 (commit `cc310e7`). **Phase 2.A.bis — Alignement Référentiel v2.1 (Mai 2026)** : ADR 0009 (Variante B), CI GitHub Actions bloquante (F-14), headers HTTP de sécurité §4.16 (F-15).

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
| **0018** | CSP nonces production-only (Variante A+nonces) — résolution DETTE-LIC-004              | Accepted |
| **0019** | Implémentation PKI Phase 3 — précisions et dérogations vs ADR 0002                     | Accepted |

### ADR anticipés (non créés — décisions absorbées dans le code)

Les ADR 0010 à 0016 listés au bootstrap (Suivi fichiers, Détail licence 4 tabs, Wizard 3 étapes, Dashboard sparkline, Notifications drawer, Renouvellements drawer, Users in Settings) **n'ont pas été matérialisés en fichiers ADR** — les décisions sont visibles dans le code et les commits de Phase 4-12 (référence : §2 historique commits par phase). Seuls les choix structuraux durables ou à dérogation Référentiel ont reçu un ADR (0017 PK serial, 0018 CSP nonces). Les autres anticipations relèvent de choix d'implémentation routiniers documentés en commit message + commentaire de code.

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

- **DETTE-LIC-003 — `app/scripts/load-env.ts` throw `ENOENT` si `app/.env` absent** : `process.loadEnvFile(".env")` (Node 21.7+) crashe quand le fichier est absent, alors que les variables peuvent déjà être présentes dans `process.env`. Le loader devrait être permissif dans ce cas. **Priorité** : moyenne. **Workaround actuel** : générer un `app/.env` (peuplé depuis le job `env:` block) en step CI avant `pnpm db:migrate` (cf. `.github/workflows/ci.yml`). À traiter Phase 13.x+.
- **DETTE-LIC-005 — i18n namespace `files.*` manquant** : `AppSidebar` rend déjà l'item `nav.items.files` (clé existante) mais aucune clé `files.*` n'est définie pour le futur écran EC-Files. À ajouter quand la Phase 10 introduira la page `/files`. **Priorité** : basse. **Phase** : 10 (fichiers + génération `.lic`).
- **DETTE-LIC-006 — UI Edit absente sur les 6 référentiels SADMIN (`/settings/team`)** : les use-cases `update*UseCase` existent côté backend (Phase 2.B étapes 2-4) et sont ré-exportés via `composition-root.ts`, mais l'onglet team n'expose que Create + Toggle (pas de bouton Edit par row). Limitation acceptée pour le périmètre étape 7 — Edit modal Dialog identique au pattern Create + Server Action `update*Action`. **Priorité** : basse. **Phase** : Phase 13.x+ (jalon dédié refinement /settings post-MVP).

### ~~DETTE-LIC-008 — PKI absente à la création client (Phase 4 avant Phase 3)~~ — **résolue Phase 3.D + 3.E**

Phase 3 (Mai 2026) résout cette dette en deux temps :

- **3.D** : `createClientUseCase` refactoré — pré-check CA présente (throw SPX-LIC-411 si absente), génération paire RSA-4096 client + cert X.509 signé par CA + persistance des 3 colonnes PKI (`client_private_key_enc`, `client_certificate_pem`, `client_certificate_expires_at`) dans la même tx que l'INSERT client + audit `CERTIFICATE_ISSUED`.
- **3.E** : `backfillClientCertificatesUseCase` (use-case + script `pnpm script:backfill-client-certs` + UI section dans `/settings/security`) génère rétroactivement les certs pour les clients pré-Phase-3 (audit mode `SCRIPT`).

Cf. ADR-0019 pour les choix d'implémentation (RSA-4096, RSASSA-PKCS1-v1_5, AES-GCM, @peculiar/x509 exception bornée).

### DETTE-LIC-009 — Breadcrumb header dynamique nom d'entité (résiduelle après Phase 11.C)

- **Cause initiale** : `Breadcrumb` (Client Component) ne reconnaissait pas les routes détail `/clients/[id]/*`, fallback pathname brut avec UUID.
- **Phase 11.C — résolution partielle** (commit `5c9ee9b`) : pattern matching côté Client sur `/clients/[uuid]/sub` et `/licences/[uuid]/sub` → affichage "Clients › Détail › Info" plutôt que UUID brut. Sub-routes mappées via i18n `nav.breadcrumb.*` (info/entites/contacts/licences/historique/articles/resume/renouvellements).
- **Reste à faire (résiduel Phase 13.x+)** : afficher le **nom de l'entité** au lieu de "Détail" (ex: "Clients › Bank Al-Maghrib › Info"). Nécessite un mécanisme Server → Client pour exposer le nom récupéré dans le layout `/clients/[id]` au composant `Breadcrumb` rendu dans `AppHeader`. Options :
  1. Next.js `template.tsx` avec React context (le layout enfant remplit le context, AppHeader le lit)
  2. Custom hook qui fetch le nom à partir de l'UUID dans le pathname (round-trip supplémentaire)
  3. URL hash / query param injecté par le layout enfant
- **Priorité** : basse (UX cosmétique). Le pattern "Détail" actuel est lisible et fonctionnel.
- **Phase cible** : Phase 13.x+ (jalon UX post-MVP).

### DETTE-LIC-011 — `allocateNextReference` race possible (lecture MAX + INSERT non-atomic)

- **Cause** : Phase 5.B — `LicenceRepositoryPg.allocateNextReference()` lit `MAX(reference)` filtré sur l'année courante, +1, puis le caller insère via `save()`. Les 2 opérations ne sont pas atomic : si 2 transactions concurrentes appellent `allocateNextReference` simultanément, elles peuvent allouer le même numéro et l'une des INSERT échouera sur la contrainte UNIQUE `uq_licences_reference`.
- **Impact** : faible volume mono-tenant + faible concurrence dev/admin. Le caller wrap l'erreur en SPX-LIC-736 (`ConflictError`) — peut être retry idempotent côté UI ou Server Action.
- **Solution future** : remplacer par une séquence Postgres dédiée `lic_licence_ref_seq` (reset annuel via fonction PG ou compteur `last_year_used` dans `lic_settings`). Exemple : `nextval('lic_licence_ref_seq')` dans une fonction stockée qui formatte `LIC-{YYYY}-{NNN}` atomiquement.
- **Priorité** : basse.
- **Phase cible** : 13 (durcissement perf prod).

### ~~DETTE-LIC-012 — Tab Articles licence reste un PhaseStub Phase 6~~ — **résolue Phase 6.F (commit `c5466a3`)**

Tab `/licences/[id]/articles` débloquée : sections produits + sous-tables articles avec volumes (consommé/autorisé/taux), Dialogs Add Produit / Add Article / Edit Volume / Remove. L'onglet `/settings/catalogues` (DETTE résiduelle des stubs Phase 2.B) est également opérationnel (CRUD SADMIN produits + articles). 11 Server Actions, schémas Zod cf. `shared/src/schemas/produit.schema.ts`, codes SPX-LIC-743..754.

### DETTE-LIC-013 — Sélecteur licences `Dialog healthcheck` /clients/[id] non-paginé

- **Cause** : Phase 10.D — `ImportHealthcheckClientButton` dans le layout `/clients/[id]` charge les licences du client via `listLicencesByClientUseCase.execute({ clientId, limit: 200 })`. Le `<select>` dropdown ne supporte pas la pagination cursor (vue dégradée si un client dépasse 200 licences — improbable mais possible Phase 13+ avec gros bancaires).
- **Impact** : faible mono-tenant (les clients vendus ont rarement >200 licences). Si dépassement, les licences au-delà ne sont pas sélectionnables → utilisateur doit aller sur la tab `licences` du client puis cliquer "Importer healthcheck" depuis la page licence directement (pattern fallback déjà fonctionnel).
- **Solution future** : remplacer le `<select>` par un combobox autocomplete avec recherche serveur paginée (TanStack Query `keepPreviousData` + cursor cf. pattern à raffiner). Idéalement un composant `<LicencePicker>` réutilisable.
- **Priorité** : basse.
- **Phase cible** : 13 (durcissement UX).

### DETTE-LIC-014 — Dropdown clients page `/renewals` non-paginé

- **Cause** : Phase 9.B — `RenewalsList` charge les clients via `listClientsUseCase.execute({ limit: 200 })` pour peupler le filtre `<select>` "Client". Pas de pagination cursor sur le dropdown.
- **Impact** : si la BD dépasse 200 clients (volume cible mono-tenant 100-200 clients SELECT-PX), les clients au-delà ne peuvent pas être filtrés depuis ce dropdown → utilisateur doit passer par `/clients` filtre FTS puis drill-down vers `/licences/[id]/renouvellements`.
- **Solution future** : combobox autocomplete avec recherche serveur (cf. DETTE-LIC-013 — même composant `<ClientPicker>` réutilisable).
- **Priorité** : basse.
- **Phase cible** : 13 (durcissement UX).

### DETTE-LIC-015 — i18n FR/EN absent sur `/settings/security` et `/settings/sandbox`

- **Cause** : Phase 3.C/3.F livré en mode rapide — labels et descriptions UI hardcodés en FR (sections CA, Backfill, Toggle, Sandbox 5 boutons). Pas de namespace `settings.security.*` ni `settings.sandbox.*` dans `messages/fr.json` + `messages/en.json`.
- **Impact** : un user EN voit du FR sur ces 2 pages. Pas bloquant pour le MVP S2M Maroc (utilisateurs francophones).
- **Solution future** : extraire toutes les chaînes UI vers `useTranslations("settings.security")` + `useTranslations("settings.sandbox")` ; ajouter clés FR/EN.
- **Priorité** : basse (UX cosmétique).
- **Phase cible** : Phase 3.x ou jalon polish UX dédié.

### DETTE-LIC-016 — Tests d'intégration `createClientUseCase` mode PKI obligatoire absents + signature dual-mode

- **Cause** : Phase 3.D — `CreateClientUseCase` accepte `settingRepository?` et `options?` optionnels pour rétrocompat avec 14+ tests d'intégration legacy (entité, licence, licence-article, licence-produit, renouvellement, volume-history) qui instanciaient `new CreateClientUseCase(...)` à 3 args. Sans cette rétrocompat, ces tests cassent au typecheck. La rétrocompat actuelle introduit une logique conditionnelle (`if (settingRepo !== undefined && options !== undefined) ... else skip PKI`) — sale niveau architecture.
- **Impact** : la couverture du chemin PKI obligatoire (3.D strict) n'est pas testée — uniquement le chemin legacy l'est. La règle 3.D `throw SPX-LIC-411 si CA absente` n'est validée que par revue de code.
- **Solution future** :
  1. Extraire un port `ClientCertIssuer` (interface) injectable à 4e position obligatoire.
  2. Adapter `CryptoClientCertIssuer` (utilise `settingRepository` + `appMasterKey`) pour la prod (composition-root).
  3. `MockClientCertIssuer` réutilisable pour tous les tests legacy d'intégration (renvoie cert dummy).
  4. Refactor `CreateClientUseCase` pour supprimer les chemins conditionnels et faire de l'issuer une dépendance obligatoire.
  5. Écrire `create-client.usecase.int.spec.ts` qui teste à la fois le chemin happy + SPX-LIC-411.
- **Priorité** : moyenne (sale architecture + test coverage manquant sur chemin sécurité critique).
- **Phase cible** : Phase 3.x (cleanup post-3.H).

### DETTE-LIC-017 — Section contacts par type embarquée dans `ClientDialog` différée

- **Cause** : Ticket T-01 — `ClientDialog` en mode edit affiche désormais les selects référentiels SADMIN (pays/devise/langue/sales/AM) mais la "section contacts par type" demandée au brief est livrée en mode read-only avec un simple lien vers la page CRUD `/clients/[id]/contacts`. L'embedded edit (ajout/édition/suppression de contacts par type ACHAT/FACTURATION/TECHNIQUE/… directement depuis le Dialog) n'est pas implémenté.
- **Impact** : double clic pour gérer les contacts d'un client (ouvrir Dialog → fermer → naviguer vers /contacts). UX OK mais pas optimal.
- **Solution future** :
  1. Charger les contacts du client en parallèle dans la page parent (`/clients/[id]/info`) et passer en prop `contactsByType: Record<string, ContactDTO[]>`.
  2. Sous-composant `ContactsSection` dans le Dialog : groupe par type, expose des actions inline `Add/Edit/Delete` qui appellent les Server Actions existantes (`createContactAction`, `updateContactAction`, `deleteContactAction`).
  3. Garder le lien vers `/clients/[id]/contacts` comme fallback pour la vue détaillée.
- **Priorité** : basse (UX confort, fonctionnalité présente sur la page dédiée).
- **Phase cible** : jalon polish UX dédié.

### DETTE-LIC-010 — Liste `typeContactCode` statique dans `ContactDialog`

- **Cause** : Phase 4.F livre `ContactDialog` avec un `<select>` peuplé d'une liste statique `TYPES_CONTACT_OPTIONS` (6 valeurs : ACHAT/FACTURATION/TECHNIQUE/JURIDIQUE/TECHNIQUE_F2/DIRECTION). Le SADMIN administre la vraie liste depuis `/settings/team` (Phase 2.B) via `lic_types_contact_ref`, mais le Dialog ne fetch pas cette liste dynamiquement.
- **Impact** : si le SADMIN ajoute un type (ex: `RGPD`), il ne sera pas visible dans le sélecteur Phase 4.F. La validation FK côté serveur attrape les codes inconnus, mais l'UX ne reflète pas la liste autoritative.
- **Solution future** : fetcher `listTypesContactUseCase` côté Server Component `contacts/page.tsx`, passer la liste en prop à `ContactsTab` → `ContactDialog`.
- **Priorité** : basse.
- **Phase cible** : 4.G ou plus tôt si demande métier.

### Dettes résolues

- **DETTE-LIC-001 — OpenTelemetry Web non installé en Phase 1** → **Résolue F-10** (`@opentelemetry/api` + `sdk-trace-web` installés, `OtelProvider` actif côté client, propagation `traceparent` opérationnelle).
- **DETTE-LIC-002 — `middleware.ts` deprecated Next.js 16** → **Sans objet (F-12)** puis **réintroduit Phase 13.A sous le nom canonique `proxy.ts`** (cf. ADR 0018) — le proxy n'a aucune logique d'auth (le check auth reste dans `(dashboard)/layout.tsx`), il porte uniquement la CSP nonce-based en prod.
- **DETTE-LIC-003 — `app/scripts/load-env.ts` throw `ENOENT` si `app/.env` absent** → **Workaround acceptable**, marquée résolue Phase 13.E : `Dockerfile` runner-app monte un `.env` vide via la step compose (option simple), et le script CI continue de générer un `.env` pré-populé. Le refactor permissif du loader Node 21.7+ est conservé en backlog optionnel mais non bloquant. **Statut** : workaround pérenne accepté.
- **DETTE-LIC-004 — CSP avec `'unsafe-inline'` + `'unsafe-eval'`** → **Résolue Phase 13.A** (commit `2b8fc3c`, ADR 0018). `app/src/proxy.ts` (Next.js 16, NODE_ENV !== 'production' guard) génère un nonce par requête et applique `script-src 'self' 'nonce-XXX' 'strict-dynamic'` en prod. `'unsafe-inline'` script + `'unsafe-eval'` éliminés en prod ; `'unsafe-inline'` style conservé en prod (compromis assumé Tailwind/Radix). DEV inchangé pour DX Turbopack/HMR.
- **DETTE-LIC-007 — `BUILD_SHA` non injecté en CI** → **Résolue Phase 13.C** (commit `7f4d27c`). `.github/workflows/ci.yml` exporte `BUILD_SHA: ${{ github.sha }}` à la step build → `/settings/info` affiche le SHA réel en prod, fallback `"dev"` en local. Aussi propagé via `Dockerfile` ARG BUILD_SHA pour le build container.
- **DETTE-LIC-012 — Tab Articles licence reste un PhaseStub Phase 6** → **Résolue Phase 6.F** (commit `c5466a3`, cf. plus haut).

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
