# Audit MVP Global LIC v2 — Mai 2026 (Master Référentiel S2M)

> **Source** : Audit indépendant Master Référentiel S2M, livré Mai 2026 sous le titre interne `AUDIT_ALIGNEMENT_LIC_v2_1.md`.
>
> **Verdict synthétique** : « MVP livré conforme dans l'esprit, à recadrer dans la lettre avant déploiement client. »
>
> Cet audit couvre LIC v2 à fin Phase 14 (avant Phase 15). Le rapport complet original est conservé en pièce jointe par S2M direction technique. Cette archive consigne la synthèse des constats et le mapping vers les actions Phase 15.

## Périmètre audité

- Code applicatif Phases 1 → 14 (~50 commits feat / fix / docs)
- Référentiel cible : v2.1 (audit Master = source de vérité v2.1 jusqu'à publication PDF)
- 26 ADR + 3 PROJECT_CONTEXT/CLAUDE.md + 7 fichiers config
- Couverture tests : 650/672 verts à fin Phase 14 (22 fails pré-existants DETTE-LIC-018)

## Synthèse — 3 + 4 + 3 = 10 corrections

### 🔴 3 corrections **bloquantes** prod (critiques)

| #   | Constat                                                                                                   | Section Référentiel        | Action Phase 15                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `pino` logger sans `redact` paths → leak password en clair / token / PAN dans les logs                    | v2.1 §4.19                 | Ajout `redact: { paths, censor: "[REDACTED]" }` + 4 tests (password, token, headers.auth/cookie, pan/cvv)                                                         |
| A2  | 65 use-cases `application/` font `import { db } from "infrastructure/db/client"` → couplage non documenté | v2.1 §4.13 (variantes A/B) | ADR-0010 acte la dérive Variante B bornée (db.transaction() uniquement)                                                                                           |
| A3  | Documentation référence `Référentiel S2M v2.0` partout alors que l'audit est v2.1                         | Cohérence docs             | Sync v2.0 → v2.1 dans CLAUDE.md / PROJECT_CONTEXT_LIC.md / README.md / docs/audit/README.md / docs/referentiel-feedback.md + placeholder PDF v2.1 (DETTE-LIC-020) |

### 🟡 4 corrections **importantes** (avant déploiement client)

| #   | Constat                                                                                                                                      | Section Référentiel       | Action Phase 15                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | `/api/health` unique probe (process+DB) — k8s ne peut distinguer liveness vs readiness                                                       | v2.1 §4.19                | Split en `/api/health/live` (process up) + `/api/health/ready` (process up + DB up). Compat ascendante via redirection fonctionnelle |
| B2  | Audits internes / externes archivés ad-hoc dans `docs/audit/` sans tableau récap par phase                                                   | v2.1 §4.21                | Tableau `docs/audit/README.md` enrichi + `audit-phase-15-alignement.md`                                                              |
| B3  | `bcryptjs.hash()` consommé directement dans 3 use-cases user (change-password, create-user, reset-user-password) — pas de port intermédiaire | v2.1 §4.13 (Critique 5.1) | Port `PasswordHasher` + adapter `BcryptPasswordHasher` (cost env) + adapter `MockPasswordHasher` (tests déterministes)               |
| B4  | `docker-compose.yml` modifiable en silence — pas dans la liste Stop validate de CLAUDE.md §9                                                 | v2.1 §4.7                 | Ajouter `docker-compose.yml` dans la liste configs Stop validate                                                                     |

### 🟢 3 mineurs (différables)

| #   | Constat                                                              | Statut Phase 15                                                                     |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| C1  | Pas de protection brute-force login (compteur d'échecs + lockout)    | **Traité** : migration 0012 + LoginUseCase + audit `LOGIN_FAILED_LOCKOUT` + 3 tests |
| C2  | Pas de MFA TOTP (back-office mono-tenant)                            | **Différé DETTE-LIC-021** (acceptable mono-provider back-office)                    |
| C3  | Pas d'audit des **lectures** sensibles (consultation données client) | **Différé DETTE-LIC-022** (audit actuellement focalisé sur mutations)               |

## Recommandations long terme — capitalisation Référentiel v2.2

L'audit Master a aussi identifié 2 remontées à intégrer dans le Référentiel v2.2 :

- **FB-24** — Variante B `db.transaction()` directement consommée en `application/` : ajouter encart §4.13 « Variante B — transactions Drizzle ». Tracé R-39.
- **FB-25** — Next.js 16 `proxy.ts` (et non `middleware.ts`) pour CSP nonces : préciser §4.16. Tracé R-40.

Voir `docs/referentiel-feedback.md` R-39 et R-40 pour le détail.

## Liens

- ADR-0010 : `docs/adr/0010-application-db-transaction-deviation.md`
- Synthèse Phase 15 : `docs/audit/audit-phase-15-alignement.md`
- Placeholder PDF v2.1 : `docs/REFERENTIEL_S2M_v2_1_PENDING.md`
- Feedback Référentiel : `docs/referentiel-feedback.md` §R-39, §R-40
