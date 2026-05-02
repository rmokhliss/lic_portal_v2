// ==============================================================================
// LIC v2 — Drizzle Kit configuration (Référentiel §1.2 + §1.4)
//
// Substitut local de Flyway (Référentiel §1.4) — décision actée projet.
// Drizzle Kit lit le wildcard `schema` ; le code applicatif lit le barrel
// app/src/server/infrastructure/db/schema/index.ts.
//
// Usage :
//   pnpm db:generate   → drizzle-kit generate (lit cette config)
//   pnpm db:migrate    → applique les migrations générées (script F-06+)
//   pnpm db:studio     → drizzle-kit studio
// ==============================================================================

// Side-effect import en PREMIER : charge .env (process.loadEnvFile natif Node)
// AVANT que infrastructure/env ne soit évalué. ESM garantit l'ordre d'exécution
// des imports dans l'ordre de déclaration.
import "./scripts/load-env";

import { defineConfig } from "drizzle-kit";

// Import RELATIF (pas `@/...`) : drizzle-kit n'utilise pas les paths TS du
// tsconfig. La validation Zod du module env crashe le script si DATABASE_URL
// est absente ou invalide (scheme non-postgres).
import { env } from "./src/server/infrastructure/env";

export default defineConfig({
  dialect: "postgresql",

  // Wildcard hexagonal : chaque module backend possède son schema.ts
  // dans son adapter Postgres (F-06+). Drizzle Kit résout le glob ;
  // le runtime importe via le barrel infrastructure/db/schema/index.ts.
  schema: "./src/server/modules/*/adapters/postgres/schema.ts",

  // Migrations versionnées dans infrastructure/db/migrations.
  // Le dossier sera créé par drizzle-kit au premier `pnpm db:generate` (F-06).
  out: "./src/server/infrastructure/db/migrations",

  dbCredentials: { url: env.DATABASE_URL },

  // Mapping auto camelCase TS → snake_case BD pour les colonnes (CLAUDE.md §4
  // conv. BD). DOIT être aligné avec drizzle(sql, { casing: "snake_case" })
  // dans client.ts — sinon le runtime émet "dateCreation" alors que la BD
  // a "date_creation". Les noms de tables (préfixe `lic_*` + pluriel) restent
  // explicites dans chaque schema.ts via pgTable("lic_xxx", ...).
  casing: "snake_case",

  // Schéma PostgreSQL : `public` par défaut. LIC v2 ne prévoit pas de schemas
  // séparés type `audit.*` ou `crypto.*` (cf. PROJECT_CONTEXT §8.6 — 26 tables
  // toutes au même niveau dans `public`). Pas de `schemaFilter` ajouté.
  verbose: true,
  strict: true,
});
