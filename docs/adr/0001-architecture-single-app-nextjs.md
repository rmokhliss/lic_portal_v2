# 0001 — Architecture single-app Next.js full-stack

## Status

Accepted — Avril 2026.

**Note (Mai 2026)** : la nomenclature « Variante A / Variante B » a été introduite dans le Référentiel S2M v2.1 §4.12 (Mai 2026), postérieurement à cet ADR. La décision documentée ici correspond formellement à la **Variante B**. L'ADR 0009 reprend ce choix dans le vocabulaire v2.1 et démontre l'éligibilité de LIC v2 critère par critère. Cet ADR 0001 reste en place pour mémoire de la décision originelle.

## Context

Le Référentiel Technique S2M v2.0 (§3) prescrit une architecture monorepo applicative avec deux workspaces principaux :

- **`backend/`** — API NestJS 11 hexagonale (`domain/application/ports/adapters`) exposant des routes REST `/v1/*`
- **`frontend/`** — Application Next.js 16 + React 19 qui consomme l'API backend via JWT

Cette architecture est dimensionnée pour les projets qui :

- Exposent une **API publique** consommée par d'autres services ou applications (mobile, partenaires)
- Ont des besoins **multi-tenant** avec RLS PostgreSQL
- Nécessitent une **scalabilité indépendante** du backend et du frontend
- Manipulent des **flux financiers** transactionnels critiques

LIC v2 ne coche aucune de ces cases :

- C'est un **back-office interne S2M** consommé uniquement par les équipes commerciales/finance
- **Mono-tenant** par construction (instance unique S2M, les "clients" sont des données dans le système)
- Volume utilisateur faible (≤30 utilisateurs simultanés) — pas d'enjeu de scalabilité différenciée
- Pas de monnaie — uniquement des **entiers de volumes** (TPE, GAB, porteurs)

## Decision

LIC v2 est une **single-app Next.js 16 full-stack**. Le frontend (App Router, Server Components) et le backend (Server Actions, modules métier hexagonaux, jobs pg-boss dans worker séparé) cohabitent dans un seul projet Next.js, organisé en monorepo pnpm avec deux workspaces : `app/` (Next.js) et `shared/` (schémas Zod).

Les **Server Actions Next.js 16** remplacent fonctionnellement les controllers NestJS du Référentiel : validation Zod, vérification de rôle, appel d'un use-case d'application, retour de DTO via mapper, `revalidatePath` pour invalider les caches Server Components. Le pattern hexagonal (`domain → application → ports → adapters`) reste **respecté à la lettre** dans `app/src/server/modules/<X>/`.

Le worker pg-boss tourne dans un **process séparé** (`pnpm worker:dev` en dev, container Docker dédié en prod), comme dans la version NestJS originale.

## Consequences

**Bonnes**

- Un seul build, un seul Dockerfile, une seule pipeline CI
- Les Server Actions Next.js 16 sont stables et fournissent nativement la sécurité (validation, CSRF, rôle) sans pile HTTP supplémentaire
- L'écart vs Référentiel ne porte que sur la **plomberie** (NestJS DI vs DI manuelle dans `<X>.module.ts`), pas sur la **discipline architecturale** (hexagonal strict respecté)
- `eslint-plugin-boundaries` valide automatiquement le respect des couches comme prescrit par le Référentiel §4.2

**Mauvaises**

- Si LIC doit exposer demain une API REST publique pour un autre service S2M ou pour des partenaires externes, il faudra extraire le backend en NestJS (ou Hono) — non bloquant mais à anticiper
- Pas de `@s2m/core-auth` JWT prêt à l'emploi — implémentation Auth.js v5 en local (sessions cookies)
- Le pattern `dependency-cruiser` mentionné par le Référentiel §4.2 n'est pas appliqué tel quel — remplacé par `eslint-plugin-boundaries` qui couvre le même besoin

**Neutres**

- Les briques `@s2m/core-*` sont implémentées localement dans `app/src/server/modules/` et `app/src/server/infrastructure/` — extraction en packages npm internes possible quand mature (cf. PROJECT_CONTEXT §7)
- Le workspace `shared/` reste utile pour les schémas Zod, même en single-app, pour discipliner les contrats UI ↔ serveur
