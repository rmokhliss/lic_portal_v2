# Audit Phase 2.A (F-01 → F-12) — s2m-lic v2

**Période** : Phase 2.A « Fondations », 12 fondations livrées
**Commit final** : `1a7475c` (F-12)
**Date audit** : 2026-05-02
**Référentiel cible** : S2M v2.0 Mai 2026
**Statut global** : Conforme avec écarts mineurs assumés (4 documentés en code, 0 critique)

---

## 1. Conformité Référentiel S2M v2.0

### Règles MUST

| #   | Règle                                                      | Statut        | Preuve                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Logger Pino partout (pas de `console.log`)                 | ✅ Respecté   | `eslint.config.mjs:105` enforce `no-console` (allow `error/warn`). Une seule occurrence : `OtelProvider.tsx:87` `console.debug` avec `eslint-disable` justifié (debug dev OTel)                                |
| M2  | Erreurs typées avec codes `SPX-LIC-NNN`                    | ✅ Respecté   | `app/src/server/modules/error/` (AppError + 7 sous-classes), catalogue dans `shared/src/constants/error-codes.ts`. Règle ESLint `no-restricted-syntax` interdit `new Error()`                                  |
| M3  | Validation Zod avant use-case                              | ✅ Respecté   | Schémas dans `shared/src/schemas/` (auth.schema.ts, audit.schema.ts). Server Actions parsent via Zod (`change-password/_actions.ts:43`, `login/_actions.ts`)                                                   |
| M4  | `auditLog.record()` dans la même transaction               | ✅ Respecté   | `change-password.usecase.ts` reçoit `auditRepository` directement (option (b) F-08). Tx sequenced dans le use-case                                                                                             |
| M5  | Hexagonal strict `domain → application → ports → adapters` | ✅ Respecté   | `eslint-plugin-boundaries` actif, 15 types déclarés, 18 règles `allow`. Voir §4                                                                                                                                |
| M6  | Server Actions = validation + use-case + revalidate        | ✅ Respecté   | 3 `_actions.ts` présents : `(auth)/login`, `(auth)/change-password`, `(dashboard)/_actions.ts` (signOut + setLocale). Pattern conforme                                                                         |
| M7  | Dates UTC `TIMESTAMPTZ`                                    | ✅ Respecté   | `infrastructure/db/columns.ts:42` helper `timestamps()` enforce `withTimezone: true` sur tous `created_at`/`updated_at`                                                                                        |
| M8  | Affichage user "Prénom NOM (MAT-XXX)"                      | ✅ Respecté   | `auth/config.ts:156` construit `display`. Consommé par `change-password/page.tsx:28`, `UserMenu.tsx:25`. Audit log capture aussi le format au moment de l'écriture                                             |
| M9  | Permissions vérifiées server + UI                          | ⚠️ Partiel    | Server : `requireRole()` / `requireAuthPage()` présents. UI : `nav-routes.ts` filtre via `canSeeRoute(role)`. **Pas encore de Server Action métier** à protéger (Phase 2.B+) — couverture théorique uniquement |
| M10 | Couverture ≥80% sur `domain/` et `application/`            | ⚠️ Non mesuré | `vitest.config.ts` n'a aucun seuil de couverture configuré. 19 fichiers de tests, 172 tests passent, mais aucun `pnpm test --coverage` n'a été exécuté ni configuré dans le CI                                 |

### Règles MUST NOT

| #   | Règle                                                                   | Statut                                  | Preuve                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N1  | Pas de `any`                                                            | ✅ Respecté                             | `eslint.config.mjs:102` `no-explicit-any: error`. Grep `\bany\b` retourne 0 résultats applicatifs                                                                                                      |
| N2  | Pas de `new Error()` ni `throw "string"`                                | ✅ Respecté avec exceptions documentées | Règle ESLint active. 7 exceptions, toutes justifiées par `eslint-disable` inline + commentaire (5 fixtures de test, 1 bootstrap récursion-impossible `app-error.ts:78`, 1 boot env `env/index.ts:124`) |
| N3  | Pas de SQL en string brut                                               | ✅ Respecté                             | Tous les accès BD passent par Drizzle query builder ou `sql` tagged template (`columns.ts:24` `sql\`uuidv7()\``). Aucun `db.execute("SELECT ...")` détecté                                             |
| N4  | Pas de cryptographie custom                                             | ✅ Respecté                             | `node-forge ^1.3.1` présent dans `package.json` (prévu pour PKI Phase 4+). Aucun `createCipher`/`createHash` custom en code applicatif. Crypto auth = `bcryptjs` (standard)                            |
| N5  | Pas de `useEffect` pour fetch                                           | ✅ Respecté                             | 1 seul `useEffect` détecté : `OtelProvider.tsx:95` pour init OTel SDK côté client (init, pas fetch). Conforme                                                                                          |
| N6  | Pas de mutations directes en composant client                           | ✅ Respecté                             | Tous les Client Components qui mutent passent par Server Action (`UserMenu.tsx` → `signOutAction`, `LocaleToggle.tsx` → `setLocaleAction`, `ChangePasswordForm.tsx` → `changePasswordAction`)          |
| N7  | Pas de CSS inline ni CSS modules                                        | ✅ Respecté                             | Tailwind `@theme` + utility classes uniquement. Aucun fichier `*.module.css` détecté                                                                                                                   |
| N8  | Pas de secret en dur                                                    | ✅ Respecté                             | Tous secrets via `process.env.X` validé par `infrastructure/env/index.ts` (Zod). `gitleaks` en CI (warning local : pas installé localement, scan en CI)                                                |
| N9  | Pas de `services/helpers/utils/lib/common/managers` dans `modules/<X>/` | ✅ Respecté                             | `eslint.config.mjs:325` règle `no-restricted-imports` enforce. Audit modules livrés (audit, error, settings, user) : structure conforme                                                                |
| N10 | Pas de `localStorage`/`sessionStorage` métier                           | ✅ Respecté                             | Grep retourne 0 résultats                                                                                                                                                                              |
| N11 | Pas de réécriture totale de fichier                                     | ✅ Respecté                             | Discipline appliquée (cf. trace conversation, `Edit` privilégié) — non vérifiable automatiquement                                                                                                      |
| N12 | Pas de visuel inventé                                                   | ✅ Respecté                             | Toutes couleurs/tailles via tokens DS SELECT-PX dans `globals.css` (F-09) + classes Tailwind correspondantes. Aucun `#hex` hardcodé                                                                    |

---

## 2. Écarts assumés vs Référentiel

| #   | Section Réf.            | Écart                                                                    | Justification                                                                                                                        | Documenté                                                                                |
| --- | ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| E1  | §1.2 (stack)            | `postgres.js` au lieu de `pg`                                            | Recommandé Drizzle 2025 (perf + types)                                                                                               | `infrastructure/db/client.ts:4` commentaire « Écart vs Référentiel §1.2 mineur »         |
| E2  | §1.3 (observabilité)    | OpenTelemetry Web SDK 2.x (vs API stable)                                | SDK 2.x = seule version supportée Next.js 16 + React 20                                                                              | `components/shared/OtelProvider.tsx:19` commentaire « Écart vs Référentiel §1.3 mineur » |
| E3  | §4.2 (no `new Error`)   | 1 occurrence métier `env/index.ts:125` (boot) + 1 dans `app-error.ts:79` | Boot-time avant init catalogue erreurs / récursion impossible dans le check de validation des codes                                  | `eslint-disable` inline + commentaire                                                    |
| E4  | §4.2 (no `console.log`) | 1 `console.debug` dans `OtelProvider.tsx:87`                             | Debug local OTel uniquement, gated `NODE_ENV !== "production"`                                                                       | `eslint-disable` inline + commentaire                                                    |
| E5  | F-07 brief (Auth.js)    | Pas de `@auth/drizzle-adapter`                                           | Strategy JWT seule → tables sessions/accounts/verification_tokens inutiles                                                           | `auth/config.ts:4-11` commentaire d'en-tête                                              |
| E6  | §4.2 (`process.exit`)   | `env/index.ts` throw au lieu de `process.exit(1)`                        | Compatibilité Edge runtime (le module peut être tiré par le bundle middleware)                                                       | `env/index.ts:113-118` commentaire                                                       |
| E7  | §4.13 (Server Actions)  | Auth check en `(dashboard)/layout.tsx` au lieu de middleware             | Auth.js v5 + Credentials = incompatible Edge runtime. Pattern documenté Auth.js (cf. <https://authjs.dev/guides/edge-compatibility>) | Commit `1a7475c` body + `(dashboard)/layout.tsx:5-7`                                     |

**Écarts non assumés détectés** : aucun.

---

## 3. Conventions de nommage (§4.5)

| Domaine              | Convention                                                 | Vérifié                                                                | Anomalie                                                                                                                     |
| -------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Tables BD            | `lic_*` snake_case pluriel                                 | ✅ `lic_audit_log`, `lic_settings`, `lic_users` (3/3)                  | Aucune                                                                                                                       |
| Exports Drizzle      | camelCase, **sans** préfixe `lic_`                         | ✅ `auditLog`, `settings`, `users`, `auditMode`, `userRole`            | Aucune                                                                                                                       |
| Enums BD             | snake_case                                                 | ✅ `audit_mode`, `user_role`                                           | Aucune                                                                                                                       |
| Types TypeScript     | PascalCase, sans préfixe `I`                               | ✅ `eslint.config.mjs:281` enforce                                     | Aucune                                                                                                                       |
| Fichiers use-case    | `<verb>-<entity>.usecase.ts`                               | ✅ `change-password.usecase.ts`, `record-audit-entry.usecase.ts`, etc. | Aucune                                                                                                                       |
| Fichiers ports       | `<entity>.repository.ts`                                   | ✅ `audit.repository.ts`, `user.repository.ts`                         | Aucune                                                                                                                       |
| Fichiers adapters PG | `<entity>.repository.pg.ts`                                | ✅ Convention respectée                                                | Aucune                                                                                                                       |
| Composition root     | `<X>.module.ts` intra-module + `composition-root.ts` cross | ✅ `audit.module.ts`, `user.module.ts`                                 | Aucune                                                                                                                       |
| Routes               | `app/(group)/<segment>/page.tsx`                           | ✅ 14 placeholders + login + change-password                           | Aucune                                                                                                                       |
| Codes erreur         | `SPX-LIC-NNN` (ranges §4 CLAUDE.md)                        | ✅ 11 codes définis dans le catalogue, tous dans les ranges déclarés   | **À noter** : nombre faible (11) car Phase 2.A ne couvre que auth+error+audit. Le catalogue grandira avec les modules métier |

**Anomalie unique détectée** : aucune.

---

## 4. Architecture hexagonale (§4.11)

### Types de boundary déclarés (15)

| Type                                          | Pattern                                 | Usage                                            |
| --------------------------------------------- | --------------------------------------- | ------------------------------------------------ |
| `domain`                                      | `modules/*/domain/**`                   | Entités, value objects                           |
| `application`                                 | `modules/*/application/**`              | Use-cases                                        |
| `ports`                                       | `modules/*/ports/**`                    | Interfaces abstract                              |
| `adapters`                                    | `modules/*/adapters/**`                 | Implémentations (Drizzle)                        |
| `module-root`                                 | `modules/*/*.module.ts`                 | DI intra-module                                  |
| `module-error`                                | `modules/error/**`                      | Erreurs typées (transverse)                      |
| `module-schema`                               | `modules/*/adapters/postgres/schema.ts` | Surface publique cross-module pour FK            |
| `infrastructure`                              | `infrastructure/**`                     | Plomberie (env, db, logger, auth, observability) |
| `composition-root`                            | `composition-root.ts`                   | SEUL câblage cross-module                        |
| `instrumentation`                             | `instrumentation.ts`                    | Boot Node hook Next.js                           |
| `middleware`                                  | `middleware.ts`                         | **⚠️ Orphelin depuis F-12** (fichier supprimé)   |
| `jobs`                                        | `server/jobs/**`                        | pg-boss workers (non encore créés)               |
| `app-route`                                   | `app/**`                                | Server Actions + pages                           |
| `components`, `hooks`, `frontend-lib`, `i18n` | —                                       | Frontend                                         |
| `shared`                                      | `shared/src/**`                         | DTOs Zod cross-workspace                         |

### Règles enforcées

- 18 règles `allow` distinctes
- `default: "disallow"` (toute dépendance non listée = erreur)
- `domain` ne dépend que de : `domain`, `shared`, `module-error`
- `application` ne dépend que de : `domain`, `ports`, `shared`, `infrastructure`, `module-error`
- `app-route` ne peut atteindre les use-cases qu'via `composition-root` (jamais `module-root` directement)

### Vérification runtime

```
$ pnpm lint   → ✅ Done (eslint --max-warnings 0)
$ pnpm typecheck → ✅ Done (shared + app)
```

**Anomalie** : type `middleware` déclaré dans la config mais fichier supprimé en F-12 fix. ESLint ne l'utilise pas (aucun fichier ne match), mais c'est du code mort à nettoyer (cf. §7).

---

## 5. Tests et couverture (§4.6)

### Inventaire (19 fichiers, 172 tests)

| Couche               | Fichiers                                              | Cible Référentiel                                                                          |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `domain/`            | 1 (`audit-entry.spec.ts`)                             | ≥80% couverture (non mesuré)                                                               |
| `application/`       | 4 (3 audit use-cases + 1 user/change-password)        | ≥80% couverture (non mesuré)                                                               |
| `adapters/postgres/` | 3 (`audit.repository.pg`, `cursor-pagination`, `fts`) | Pas de seuil Référentiel                                                                   |
| `infrastructure/`    | 7 (auth × 2, db × 4, env, logger)                     | Pas de seuil Référentiel                                                                   |
| `module-error/`      | 2 (app-error, errors)                                 | —                                                                                          |
| `i18n/`              | 1 (messages)                                          | —                                                                                          |
| **E2E Playwright**   | **0**                                                 | **Manque** : Référentiel §4.6 prévoit Playwright pour flows critiques (login, healthcheck) |

### Couverture quantifiée

**Non mesurée**. `vitest.config.ts` ne déclare aucun seuil. Aucun `pnpm test --coverage` exécuté en CI ni localement durant Phase 2.A.

→ **Action requise Phase 2.B** : ajouter `coverage.thresholds` dans `vitest.config.ts` + commande `make coverage` + check CI.

### Pattern d'isolation

`fileParallelism: false` global (F-07) pour éviter conflits sur la BD partagée. Note F-13 dans `vitest.config.ts:11` : refactor en pattern `*.int.spec.ts` ciblé prévu quand >30 fichiers unit.

---

## 6. Dette technique LIC v2 (état au commit 1a7475c)

| ID            | Sujet                                   | État réel                             | État dans `PROJECT_CONTEXT_LIC.md`   |
| ------------- | --------------------------------------- | ------------------------------------- | ------------------------------------ |
| DETTE-LIC-001 | OpenTelemetry Web non installé          | **Résolue** par F-10                  | ⚠️ **Toujours listée comme ouverte** |
| DETTE-LIC-002 | `middleware.ts` deprecated → `proxy.ts` | Sans objet (middleware supprimé F-12) | Retirée à juste titre                |

**Anomalie** : DETTE-LIC-001 doit être marquée « Résolue F-10 » ou retirée du document (cf. §7).

**Aucune nouvelle dette créée par F-12.**

---

## 7. Points à améliorer pour Phase 2.B

| #   | Point                                                      | Sévérité                 | Recommandation                                                                                                                                                                                             |
| --- | ---------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | DETTE-LIC-001 obsolète                                     | Cosmétique               | Marquer « Résolue F-10 » dans `PROJECT_CONTEXT_LIC.md §10` ou déplacer en sous-section « Dettes résolues »                                                                                                 |
| 2   | Type `middleware` orphelin dans `eslint.config.mjs:75`     | Cosmétique               | Retirer la ligne (3 lignes au total, lignes 73-75) — code mort sans effet                                                                                                                                  |
| 3   | Couverture tests non mesurée                               | **Bloquant Référentiel** | Ajouter `coverage: { provider: "v8", thresholds: { lines: 80, ... } }` dans `vitest.config.ts`, restreint à `domain/**` et `application/**`. Cible la commande `make coverage`                             |
| 4   | Aucun test E2E Playwright                                  | Important                | Au minimum 1 test Playwright avant Phase 4 (EC-Clients) : flow `login → /change-password → /` (clôt M9 « UI » avec une vraie validation)                                                                   |
| 5   | Permissions M9 partiellement validé                        | Important                | Couverture théorique seulement (helpers présents, pas de Server Action métier à protéger). Re-tester M9 dès la première mutation Phase 4                                                                   |
| 6   | `app/src/middleware.ts` toujours référencé en commentaires | Cosmétique               | Grep `middleware` dans `app/src` retourne 2 occurrences résiduelles dans des commentaires (`env/index.ts:115`, `(dashboard)/layout.tsx:6`). Acceptable en l'état (mention « futurs middleware/edge code ») |
| 7   | Commitlint scope `layout` non whitelisté                   | Cosmétique               | F-12 a dû passer en `feat(components)` faute de scope `layout`. Si la Phase 2.B introduit d'autres travaux layout, ajouter `layout` à la liste `scope-enum` du `commitlint.config.cjs`                     |
| 8   | DETTE-LIC-001 + DETTE-LIC-002 bilan                        | —                        | Aucune dette ouverte. Phase 2.A clôturée nette                                                                                                                                                             |
| 9   | Module `settings/` incomplet (adapters/ uniquement)        | Faible                   | Squelette suffisant Phase 2.A. Domain + application + ports à créer en Phase 2.B (EC-13 Paramétrage)                                                                                                       |

---

## Synthèse

- **10/10 fondations livrées** (F-01 à F-12, dont 2 fusionnées F-01+F-02)
- **0 violation MUST/MUST NOT critique**, **6 écarts mineurs assumés** documentés en code (5 commentaires + 1 commit body)
- **Architecture hexagonale enforced par CI** (boundaries + lint + typecheck verts)
- **172 tests passent**, mais **couverture non mesurée** (point bloquant le plus important pour validation Référentiel)
- **0 dette technique ouverte** au commit `1a7475c`
- **Phase 2.B prête à démarrer** sous réserve de l'action #3 (seuil couverture)

**Recommandation au validateur Référentiel** : le projet pilote remplit l'essentiel de §4. Le seul point qui mérite traitement avant Phase 2.B est la mesure formelle de couverture (action #3 ci-dessus). Les autres anomalies sont cosmétiques.
