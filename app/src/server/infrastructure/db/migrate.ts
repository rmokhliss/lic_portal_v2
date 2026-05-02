// ==============================================================================
// LIC v2 — Script CLI d'application des migrations Drizzle (F-06+)
//
// Lancé par `pnpm db:migrate`. Lit les fichiers .sql de
// ./src/server/infrastructure/db/migrations/ et les applique dans l'ordre,
// en s'appuyant sur la table interne drizzle.__drizzle_migrations pour
// éviter les ré-applications.
//
// Connexion DÉDIÉE (max=1) : on n'utilise pas client.ts (qui charge le
// module schema entier en side-effect). Pour un script CLI, mieux vaut
// une connexion isolée et fermée explicitement à la fin.
// ==============================================================================

// Side-effect import en PREMIER : charge .env avant que infrastructure/env
// ne soit évalué (cf. drizzle.config.ts).
import "../../../../scripts/load-env";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { env } from "@/server/infrastructure/env";
import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("db/migrate");

async function runMigrations(): Promise<void> {
  log.info({ url: env.DATABASE_URL.replace(/:[^:@]*@/, ":***@") }, "Starting migrations");

  // Connexion dédiée, max=1 (recommandation Drizzle pour les migrations).
  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

  try {
    const db = drizzle(migrationClient);
    await migrate(db, {
      migrationsFolder: "./src/server/infrastructure/db/migrations",
    });
    log.info("Migrations applied successfully");
  } finally {
    await migrationClient.end();
  }
}

runMigrations().catch((err: unknown) => {
  log.error({ err }, "Migration failed");
  process.exit(1);
});
