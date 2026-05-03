# 0009 — Choix de la Variante B (Next.js full-stack) — alignement Référentiel v2.1 §4.12

## Status

Accepted — Mai 2026.

Alignement avec le Référentiel S2M v2.1 §4.12 (Variantes architecturales acceptées). Cet ADR formalise dans le vocabulaire v2.1 la décision originelle prise dans ADR 0001 (Avril 2026), antérieure à l'introduction de la nomenclature « Variante A / Variante B ».

## Context

Le Référentiel S2M v2.1 §4.12 (Mai 2026) introduit deux variantes structurelles explicitement reconnues, avec une règle d'usage forte :

| Variante                      | Description                                                                               | Pattern                                          | Critères de choix                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — par défaut**            | `backend/` NestJS 11 + `frontend/` Next.js 16 séparés                                     | REST + JWT                                       | API publique consommée par tiers • multi-tenant + RLS • besoin de scalabilité indépendante front/back • monétique transactionnelle critique    |
| **B — single-app full-stack** | `app/` Next.js 16 unique avec backend dans `app/src/server/modules/`. Hexagonal préservé. | Server Actions remplacent les controllers NestJS | Back-office interne mono-tenant • équipe 5 devs • pas d'API publique • pas de monétique transactionnelle • ADR justifiant le choix obligatoire |

Le Référentiel précise §4.12 :

> Tout projet S2M démarre sur la variante A par défaut sauf ADR.
> Bascule A → B impossible sans réarchitecture : choisir tôt et explicitement.

LIC v2 a démarré au bootstrap (Avril 2026) en single-app Next.js full-stack, choix documenté dans ADR 0001 — mais antérieurement à l'introduction de la nomenclature « Variante A / Variante B » dans le Référentiel (v2.0 → v2.1). Le présent ADR formalise ce choix dans le vocabulaire v2.1 et démontre, critère par critère, l'éligibilité de LIC v2 à la Variante B.

## Decision

LIC v2 implémente la **Variante B — Single-app Next.js full-stack** au sens du Référentiel S2M v2.1 §4.12.

### Mapping des 5 critères §4.12 à LIC v2

| #   | Critère §4.12 Variante B (formulation littérale) | Situation LIC v2                                                                                                                                                                                                            | Source                                               |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Back-office interne mono-tenant                  | Portail interne S2M, audience commerciaux et finance S2M. Les « clients » sont des données et non des tenants (pas de `tenant_id`, pas de RLS).                                                                             | `PROJECT_CONTEXT_LIC.md` §1 + règle L1 §6            |
| 2   | Équipe 5 devs                                    | Équipe LIC v2 — 5 devs (équipe pilote Référentiel S2M v2.0).                                                                                                                                                                | `PROJECT_CONTEXT_LIC.md` §1 (statut pilote)          |
| 3   | Pas d'API publique                               | Mutations 100 % via Server Actions, lectures via Server Components / TanStack Query. Seuls 2 endpoints API techniques : `/api/health` (anonyme) et `/.well-known/s2m-ca.pem` (toggle SADMIN, distribution clé publique CA). | `PROJECT_CONTEXT_LIC.md` §4 + §8.4                   |
| 4   | Pas de monétique transactionnelle                | LIC manipule uniquement des compteurs entiers (TPE, GAB, porteurs, modules). Aucun montant, aucun flux financier. Pas de `decimal.js`.                                                                                      | `PROJECT_CONTEXT_LIC.md` §3 (Adaptations) + règle L2 |
| 5   | ADR justifiant le choix obligatoire              | **Présent ADR 0009** (et ADR 0001 antérieur en mémoire de la décision originelle).                                                                                                                                          | ce document                                          |

Les 5 critères sont satisfaits. La Variante B est applicable de droit pour LIC v2.

### Conséquences pratiques §4.12 (différences A vs B appliquées à LIC v2)

| Élément                  | Variante A                          | **Variante B (LIC v2)**                                                                      | Référentiel        |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| Couche HTTP              | Controller HTTP NestJS              | **Server Action Next.js** (`_actions.ts` co-localisée avec `page.tsx`)                       | §4.13.4 vs §4.13.6 |
| Injection de dépendances | DI NestJS (décorateurs, container)  | **DI manuelle** dans `<X>.module.ts` (composition root par module)                           | §4.11              |
| Rate limiting            | `@nestjs/throttler`                 | À implémenter en middleware Next.js si endpoints publics exposés (non requis phase actuelle) | §4.16              |
| Authentification         | JWT access mémoire + refresh cookie | **Sessions cookies Auth.js v5**                                                              | §4.2               |
| Couche REST              | Présente (`/v1/*`)                  | **Absente** (sauf 2 endpoints système cités critère 3)                                       | §4.12              |

La **discipline architecturale §4.12 reste identique** dans les deux variantes : hexagonal strict (`domain/application/ports/adapters`), audit obligatoire dans la même transaction (règle L3), codes erreur typés `SPX-LIC-NNN`, couverture tests ≥80 % sur `domain/` et `application/`. L'écart vs Variante A ne porte que sur la plomberie HTTP, pas sur la discipline.

### Bascule future

§4.12 souligne : « Bascule A → B impossible sans réarchitecture : choisir tôt et explicitement. » La symétrique B → A est également coûteuse (extraction du backend en projet NestJS séparé, ajout d'une couche REST, migration JWT, ajout `@nestjs/throttler`). Si demain LIC doit exposer une API publique pour un autre service S2M ou des partenaires externes, l'extraction sera réalisée par projet dédié, pas par évolution incrémentale de LIC v2.

## Consequences

**Bonnes**

- Conformité explicite avec Référentiel v2.1 §4.12 (vocabulaire formalisé).
- Mapping critère par critère démontre l'éligibilité de LIC v2 à la Variante B — trace pour audits internes et futures revues d'architecture S2M.
- Cohérence avec le pattern d'alignement déjà appliqué dans ADR 0008 (alignement §4.5 nommage React) : les ADR LIC v2 documentent systématiquement les alignements nominatifs avec les versions successives du Référentiel.

**Mauvaises**

- Aucune au-delà des conséquences déjà documentées dans ADR 0001 (extraction ultérieure en NestJS = projet dédié si API publique requise un jour).

**Neutres**

- ADR 0001 reste en place pour mémoire de la décision originelle (Avril 2026, pré-v2.1). Une **Note (Mai 2026)** y est ajoutée renvoyant vers cet ADR 0009.
- Les patterns concrets Variante B (Server Action, DI manuelle dans `<X>.module.ts`, sessions Auth.js v5) sont déjà appliqués dans le code depuis le bootstrap. Le présent ADR ne change rien au code — il acte un alignement vocabulaire.
