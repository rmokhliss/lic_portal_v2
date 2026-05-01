# 0005 — Identifiants `uuidv7` PG 18

## Status
Accepted — Avril 2026

## Context

Le choix du type des identifiants primaires des tables BD impacte plusieurs aspects : URLs, performances d'index, capacités de réplication, simplicité de seeding et de tests.

Le Référentiel S2M v2.0 (§1.4) ne tranche pas explicitement, mais mentionne que PostgreSQL 18 fournit nativement `uuidv7`. PG 18 est l'une des évolutions majeures retenues pour la stack S2M.

Trois options évaluées :

1. **`serial` (entiers auto-incrémentés)** — simple, lisible (`/licences/42`), familier, pratique pour debug. Mais nécessite une séquence centralisée (pas de génération distribuée), et expose un compteur facilement énumérable dans les URLs.

2. **`uuid v4` (aléatoire)** — non énumérable, génération distribuée, mais **fragmente les index B-tree** (pas d'ordre temporel), ce qui dégrade les insertions à grande échelle.

3. **`uuid v7`** — combiné dans le temps. Les premiers bits encodent un timestamp Unix, donc nouveaux UUIDs sont **ordonnés temporellement** comme un `serial` (pas de fragmentation d'index). Mais sans séquence centralisée, génération distribuée, non énumérable. PG 18 le fournit nativement (`uuidv7()`). Drizzle 0.45 le supporte via `.defaultRandom()` ou via la fonction Postgres directement.

LIC v2 est mono-tenant et n'a pas besoin de génération distribuée immédiatement. Mais :
- Une réplication multi-instance pourrait devenir utile dans 2-3 ans (DR, lecture seule, etc.)
- Les autres projets SPX (PHS, MON, ACQ, CRD, ATM) seront probablement multi-instance dès le départ
- Standardiser dès LIC évite une migration douloureuse plus tard

## Decision

Toutes les tables métier LIC v2 utilisent **`uuidv7`** comme clé primaire.

**Schéma type Drizzle** :
```ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const clients = pgTable("lic_clients", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  codeClient: varchar("code_client", { length: 20 }).unique().notNull(),
  raisonSociale: varchar("raison_sociale", { length: 200 }).notNull(),
  // ...
});
```

**Conventions** :
- URLs : `/licences/{uuid}` au lieu de `/licences/42`
- Audit log : `entity_id` reste `uuid` typé (pas de `integer`)
- Foreign keys : `client_id uuid NOT NULL REFERENCES lic_clients(id)`

**Exception** : références **lisibles humain** conservées pour les artefacts métier que les utilisateurs manipulent oralement ou par email :
- `lic_licences.reference = "LIC-AAAA-NNN"` (séquentiel par année)
- `lic_users.matricule = "MAT-NNN"`
- `lic_clients.code_client = "ATW", "BAM", "CIH"` etc.

Ces références coexistent avec l'`id` UUID interne.

## Consequences

**Bonnes**
- URLs non énumérables (sécurité par obscurité minimale, mais utile)
- Future-proof pour réplication/sharding/multi-instance sans migration
- Pas de fragmentation d'index B-tree (contrairement à uuid v4)
- Génération distribuée possible si on extrait le backend en NestJS plus tard
- Standard moderne adopté par les autres projets SPX dès la v1

**Mauvaises**
- URLs moins lisibles pour debug humain (`/licences/0192c5d1-...` vs `/licences/42`)
- Tailles d'index +50% vs `serial` (négligeable à l'échelle de LIC : <1M lignes par table)
- En seed/tests, plus difficile de coder en dur les IDs (compensé par l'usage des références lisibles `LIC-2025-001`, `MAT-001` qui restent stables et déterministes)

**Neutres**
- Drizzle Studio + audit log compensent la difficulté de debug visuel par UUID
- Les Server Actions et les tests utilisent les références lisibles quand possible (`getLicenceByReference("LIC-2025-001")`) plutôt que l'UUID interne
- Les rapports affichent les références lisibles, jamais l'UUID
