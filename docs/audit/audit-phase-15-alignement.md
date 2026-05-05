# Audit Phase 15 — Alignement Référentiel v2.1 (synthèse interne)

> **Date livraison** : Mai 2026
> **Origine** : Audit Master indépendant Mai 2026 (`AUDIT_MVP_GLOBAL_MAI_2026.md`)
> **Verdict cible** : conformité Référentiel v2.1, Go déploiement préprod / client

## Bloquants traités

### A1 — Redaction PII pino (BLOQUANT prod)

- **Risque** : leak `password` en clair / `token` de session / `pan` carte bancaire dans les logs Pino.
- **Action** : `pino.redact({ paths, censor: "[REDACTED]" })` avec 26 paths couvrant password (top + nested), token, authorization, headers.cookie, pan, cvv.
- **Tests** : 4 cas dans `logger.spec.ts` (password, token, headers.auth/cookie, pan/cvv).
- **Vérif** : `pnpm vitest run logger` → 6 tests verts (2 existants + 4 nouveaux).
- **Référentiel cible** : v2.1 §4.19.

### A2 — ADR application → infrastructure/db (Stop validate, dérive bornée)

- **Constat** : 65 use-cases `application/` consomment directement `db.transaction()` depuis `infrastructure/db/client`.
- **Décision** : ADR-0010 acte la dérive en Variante B (Next.js full-stack) avec 3 contraintes : usage `db.transaction()` uniquement, `tx` opaque côté ports, pas d'autre primitive Drizzle en `application/`.
- **Action** : ADR-0010 créé + commentaire renvoi dans `eslint.config.mjs` (couple `application → infrastructure`) + R-39 dans `docs/referentiel-feedback.md`.
- **Référentiel cible** : v2.1 §4.13 (variantes architecturales A/B).

### A3 — Sync documentaire v2.0 → v2.1

- **Constat** : 14+ mentions « Référentiel v2.0 » dans la doc projet alors que l'audit cible v2.1.
- **Action** : remplacements dans CLAUDE.md / PROJECT_CONTEXT_LIC.md / README.md / docs/audit/README.md / docs/referentiel-feedback.md (ligne 4). Mention « Audit Master Mai 2026 — alignement v2.1 livré Phase 15 » dans PROJECT_CONTEXT §2.
- **Sous-tâche A3.1** : PDF v2.1 non encore livré → placeholder `docs/REFERENTIEL_S2M_v2_1_PENDING.md` créé + DETTE-LIC-020 tracée.
- **Vérif** : `grep -n "Référentiel S2M v2\.0\|Référentiel Technique S2M v2\.0\|Référentiel v2\.0" CLAUDE.md PROJECT_CONTEXT_LIC.md README.md docs/audit/README.md` → 0 résultat (les ADR archivés conservent v2.0 — accepté à l'époque).

## Importants traités

### B1 — Split `/api/health` en `/live` + `/ready`

- **Routes** :
  - `/api/health/live` : 200 + `{ status, uptime }`. Pas de check DB.
  - `/api/health/ready` : 200 si DB up, 503 si DB down. Logique recopiée de l'ancien `/api/health`.
  - `/api/health` : conservé en redirection fonctionnelle (réexporte `GET` du `ready/route.ts`) — compat ascendante avec Phase 13.E `Dockerfile` HEALTHCHECK.
- **Tests** : 3 cas dans `health.spec.ts` (live OK, ready OK avec mock SELECT 1, ready 503 avec mock erreur — vérif aucune fuite hostname/cause dans le payload public).
- **Référentiel cible** : v2.1 §4.19 (probes Kubernetes liveness vs readiness).

### B2 — Archive audits par phase

- `AUDIT_MVP_GLOBAL_MAI_2026.md` créé : synthèse de l'audit Master + mapping vers les actions Phase 15.
- `audit-phase-15-alignement.md` (ce fichier) : synthèse interne Phase 15.
- `docs/audit/README.md` : tableau Phase / Date / Audit interne / Audit externe Master enrichi.

### B3 — Port `PasswordHasher` + adapter bcrypt

- Pattern Phase 14 (port + adapter) reproduit pour les 3 use-cases user qui consommaient `bcryptjs` directement.
- Structure :
  - `app/src/server/modules/user/ports/password-hasher.ts` — abstract class `PasswordHasher` avec `hash()` + `verify()`.
  - `adapters/bcrypt/password-hasher.bcrypt.ts` — `BcryptPasswordHasher` (cost configurable).
  - `adapters/mock/password-hasher.mock.ts` — `MockPasswordHasher` déterministe (gain perf significatif sur les tests).
- 3 use-cases refactorés : `change-password.usecase.ts`, `create-user.usecase.ts`, `reset-user-password.usecase.ts`.
- Composition root : `passwordHasher = new BcryptPasswordHasher(env.BCRYPT_COST)` injecté dans les 3.
- Tests : tests existants migrés vers `MockPasswordHasher` (gain ~5-10× perf sur les specs `change-password.usecase.spec.ts`) + nouveau `password-hasher.bcrypt.spec.ts` (round-trip hash/verify, rejection mauvais mdp).
- **Référentiel cible** : v2.1 §4.13 critique 5.1 (ports métier vs primitives natives).

### B4 — Liste configs Stop validate

- `CLAUDE.md` racine §9 — ajout `docker-compose.yml` dans la liste des fichiers config nécessitant Stop validation.
- **Référentiel cible** : v2.1 §4.7 (post FB-08).

## Mineurs

### C1 — Brute-force lockout (TRAITÉ)

- **Migration 0012** : `lic_users.failed_login_count integer DEFAULT 0 NOT NULL` + `lic_users.last_failed_login_at timestamptz`.
- **LoginUseCase** : incrémente sur échec, reset à 0 sur succès, lockout 60 min après 5 échecs.
- **Codes erreur** : `SPX-LIC-803` (compte verrouillé brute-force).
- **Audit** : `LOGIN_FAILED_LOCKOUT` (mode `MANUEL`).
- **Tests** : 3 cas — échec → counter+1, 5 échecs → SPX-LIC-803, succès → reset.
- **Référentiel cible** : v2.1 §4.17 (sécurité auth).

### C2 — MFA TOTP (DIFFÉRÉ DETTE-LIC-021)

- Acceptable pour back-office mono-tenant avec audience SADMIN/ADMIN restreinte (≤20 comptes BO S2M).
- À considérer Phase 16+ si déploiement client multi-banques avec accès distant SADMIN.

### C3 — Audit des lectures sensibles (DIFFÉRÉ DETTE-LIC-022)

- Audit actuellement focalisé sur mutations (CREATE/UPDATE/DELETE/STATUS_CHANGED). Lectures non auditées.
- Reco : audit `LIST` / `READ_DETAIL` sur `clients`, `contacts`, `licences` pour compliance RGPD (qui consulte quoi).
- Volume potentiel élevé (1 entrée audit par GET) — exige réflexion sur stockage et rétention.

## Vérifications finales attendues

- `pnpm test` → 650+N tests verts (≥10 nouveaux).
- `pnpm lint` vert.
- `pnpm build` vert.
- `grep -rn "Référentiel S2M v2\.0\|Référentiel v2\.0" CLAUDE.md PROJECT_CONTEXT_LIC.md README.md docs/audit/README.md` → 0 résultat.
- `git log --oneline` Phase 15 → 8-10 commits scoped.

## Liens

- Audit Master : `docs/audit/AUDIT_MVP_GLOBAL_MAI_2026.md`
- ADR-0010 : `docs/adr/0010-application-db-transaction-deviation.md`
- Placeholder PDF : `docs/REFERENTIEL_S2M_v2_1_PENDING.md`
- Feedback Référentiel v2.2 : `docs/referentiel-feedback.md` R-39, R-40
- Dettes ouvertes : `PROJECT_CONTEXT_LIC.md` §10 (DETTE-LIC-020, DETTE-LIC-021, DETTE-LIC-022)
