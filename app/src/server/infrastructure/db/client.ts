// ==============================================================================
// LIC v2 — Client PostgreSQL : pool postgres.js + instance Drizzle (Référentiel §1.2)
//
// Écart vs Référentiel §1.2 mineur — postgres.js recommandé Drizzle 2025,
// pg réservé aux cas spéciaux (migrations ad-hoc).
// À remonter feedback Référentiel à la prochaine vague groupée.
//
// Singleton HMR-safe : en dev Next.js, le module est rechargé à chaque hot-reload.
// On épingle le pool sur globalThis (`__lic_sql` / `__lic_db`) pour éviter
// l'accumulation de pools fantômes qui satureraient `max_connections` en quelques
// heures de développement intensif. En prod, attachement skippé (instanciation
// unique, pas de HMR).
//
// Usage :
//   import { db } from "@/server/infrastructure/db/client";  // requêtes Drizzle
//   import { sql } from "@/server/infrastructure/db/client"; // healthcheck, shutdown
// ==============================================================================

import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/server/infrastructure/env";
import * as schema from "@/server/infrastructure/db/schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// `var` est requis ici par TypeScript pour augmenter le type de `globalThis`
// (la seule syntaxe acceptée par `declare global`). ESLint ne flag pas ces
// déclarations ambient. Underscores intentionnels pour namespacing du global.
declare global {
  var __lic_sql: postgres.Sql | undefined;
  var __lic_db: DrizzleDb | undefined;
}

function buildSql(): postgres.Sql {
  return postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_SIZE,
    // Options additionnelles (ssl, prepare, idle_timeout, etc.) à ajouter
    // si/quand env le requiert (F-06+).
  });
}

function buildDb(client: postgres.Sql): DrizzleDb {
  // `casing: "snake_case"` impératif côté runtime — symétrique avec
  // drizzle.config.ts. Sans ça, Drizzle émet `SELECT "dateCreation"` alors
  // que la colonne est `date_creation` → erreur runtime immédiate.
  return drizzle(client, { schema, casing: "snake_case" });
}

const sqlClient: postgres.Sql = globalThis.__lic_sql ?? buildSql();
const dbClient: DrizzleDb = globalThis.__lic_db ?? buildDb(sqlClient);

if (env.NODE_ENV !== "production") {
  globalThis.__lic_sql = sqlClient;
  globalThis.__lic_db = dbClient;
}

export const sql: postgres.Sql = sqlClient;
export const db: DrizzleDb = dbClient;
