# 0010 — Couplage `application/` → `infrastructure/db/client` autorisé en Variante B (transaction uniquement)

## Status

Accepted — Mai 2026 (Phase 15, suite audit Master Référentiel v2.1).

## Context

L'audit Master Référentiel v2.1 (Mai 2026) note que LIC v2 importe directement `db` depuis `infrastructure/db/client` dans plusieurs use-cases de la couche `application/` pour ouvrir une transaction Drizzle (`db.transaction(async (tx) => { ... })`). À fin Phase 14, **65 imports** de cette forme sont en place :

- `change-password.usecase.ts`, `create-user.usecase.ts`, `update-user.usecase.ts`, `toggle-user-active.usecase.ts`, `reset-user-password.usecase.ts`
- `create-client.usecase.ts`, `update-client.usecase.ts`, `change-client-status.usecase.ts`
- `create-licence.usecase.ts`, `update-licence.usecase.ts`, `change-licence-status.usecase.ts`
- `create-renouvellement.usecase.ts`, `valider-renouvellement.usecase.ts`, `annuler-renouvellement.usecase.ts`, `update-renouvellement.usecase.ts`
- `create-entite.usecase.ts`, `update-entite.usecase.ts`, `toggle-entite-active.usecase.ts`
- `create-contact.usecase.ts`, `update-contact.usecase.ts`, `delete-contact.usecase.ts`
- 5 use-cases licence-article + licence-produit (add/update/remove)
- 4 use-cases alert-config (create/update/delete)
- `generate-ca.usecase.ts`, `backfill-client-certs.usecase.ts`
- jobs : `expire-licences.handler.ts`, `auto-renew-licences.handler.ts`, `check-alerts.handler.ts`, `snapshot-volumes.handler.ts`

L'orthodoxie hexagonale stricte (« Variante A » du Référentiel S2M, projets Nest.js séparés `app/` + `worker/` + ports découpés) recommande un port `UnitOfWork` (et son adapter `UnitOfWorkPg`) pour exposer la primitive transactionnelle sans coupler `application/` à Drizzle ni à `infrastructure/db/`.

L'audit Master propose 3 options :

1. **Refactor UnitOfWork** : créer un port `UnitOfWork.execute<T>(fn: (tx: TxScope) => Promise<T>): Promise<T>` + `UnitOfWorkPg` adapter. Tous les use-cases l'injectent. ~65 fichiers à modifier + tests adaptés.
2. **ADR de dérive (Variante B)** : acter le couplage comme une dérive **bornée** documentée, justifiée par le choix Variante B Next.js full-stack (ADR-0009). Pas de refactor.
3. **Statu quo silencieux** : accepter la dérive sans la documenter — non retenu, casse la traçabilité d'audit.

## Decision

**Option 2 retenue** : le couplage `application/ → infrastructure/db/client` est **autorisé en Variante B**, mais **strictement borné** à l'usage de la primitive `db.transaction()`. Toute autre opération de persistance (SELECT, INSERT, UPDATE, DELETE hors transaction multi-statements) **doit** passer par un port `<X>Repository` (pattern hexagonal préservé sur la lecture/écriture).

Conditions de la dérive :

1. **Usage limité à `db.transaction(async (tx) => { ... })`** — les use-cases ouvrent une tx top-level et passent le `tx` en paramètre aux ports repositories qui acceptent un `tx?: DbTransaction`. Les repositories restent abstraits côté `ports/`.
2. **Pas de query Drizzle directe en `application/`** — ni `db.select()`, ni `db.update()`, ni `db.execute()` en couche use-case. Vérifié par revue de code (la règle ESLint actuelle laisse passer mais le pattern de fait est `db.transaction()` only).
3. **Le `tx` reste opaque côté port** — `DbTransaction = unknown` dans les ports, cast Drizzle uniquement dans l'adapter Postgres. L'application/ ne lit jamais les méthodes Drizzle de `tx`.

## Consequences

**Bonnes**

- Aucun refactor massif de 65 fichiers + tests adaptés. Économie ~10-15 jours/dev.
- L'orchestration `audit + mutation` dans la même tx (règle L3) reste **lisible et explicite** au niveau du use-case (la tx top-level vit là où l'orchestration vit).
- Variante B Next.js full-stack accepte ce couplage par construction (ADR-0009) — `app/` et `worker/` partagent la même infrastructure DB monolithique.
- Le pattern de fait est **unifié** sur les 65 occurrences (toutes utilisent le même `db.transaction()` avec passage de `tx` aux ports).

**Mauvaises**

- En cas de migration future vers Variante A (séparation `app/` / `worker/` / ports découpés), il faudra introduire un port `UnitOfWork` (refactor identifié, pas urgent).
- La dérive doit être **mentionnée explicitement** dans tout nouveau use-case mutateur (commentaire de classe ou ADR) — le pattern n'est pas auto-explicite pour un nouveau venu.

**Neutres**

- Phase 14 a montré que les **autres** ports métier (PasswordHasher Phase 15, EmailSender Phase 14) sont bien implémentés sous forme port + adapter. La dérive Variante B s'applique uniquement à `db.transaction()`, pas à l'ensemble de l'infrastructure.
- Le port `UnitOfWork` reste l'**idéal Variante A**. Référencer cet ADR-0010 quand un projet S2M futur passe en Variante A.

## Reco évolution Référentiel v2.2+

Remontée **FB-24** (audit Master Mai 2026) :

> Le Référentiel v2.1 §4.13 ne précise pas que la primitive `db.transaction()` peut être utilisée directement en `application/` côté Variante B Next.js full-stack, sans port `UnitOfWork` intermédiaire. Recommandation : ajouter un encart **« Variante B — transactions Drizzle »** précisant :
>
> - Variante A (projets Nest.js séparés) : port `UnitOfWork` obligatoire, adapter `UnitOfWorkPg` injecté.
> - Variante B (Next.js full-stack) : `db.transaction()` directement consommé en `application/` autorisé, **uniquement** pour la primitive transactionnelle. Toutes les requêtes hors tx passent par un port `<X>Repository`.

Tracé R-39 dans `docs/referentiel-feedback.md`.

## ESLint

`eslint.config.mjs` autorise actuellement `application → infrastructure/*` sans restriction (cf. couple `application → infrastructure` dans la matrice boundaries). Un commentaire renvoyant à cet ADR est ajouté pour expliciter la dérive Variante B (le code applicatif ne doit consommer **que** `db.transaction()` depuis `infrastructure/db/client`, pas les autres primitives Drizzle).

## Références

- ADR 0009 — Variante B Next.js full-stack
- Référentiel S2M v2.1 §4.13 (variantes architecturales A/B)
- `docs/referentiel-feedback.md` — R-39 (FB-24 audit Master Mai 2026)
- `app/src/server/composition-root.ts` — DI manuelle cross-module
