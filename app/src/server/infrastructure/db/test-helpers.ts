// ==============================================================================
// LIC v2 — Helpers tests d'intégration BD (F-08)
//
// Pattern à FIGER pour tous les futurs tests d'intégration BD :
//   1. createTestDb() dans beforeAll → connexion dédiée max:1
//   2. setupTransactionalTests(ctx) → wrap chaque test dans BEGIN; ... ROLLBACK;
//   3. afterAll → ctx.close()
//
// Avantages vs TRUNCATE :
//   - Quasi-instantané (rollback >> truncate)
//   - Préserve le seed SYSTEM (F-06) sans re-seed manuel
//   - Isolation totale entre tests d'un même fichier
//
// Pré-requis architectural : les adapters injectent `db` en constructor (DI
// optionnelle, default = singleton). Ainsi le test peut substituer son propre
// `db` lié à la connexion `sql` test, et BEGIN/ROLLBACK capture toutes les
// requêtes du repo.
//
// PAS d'`import "server-only"` ici : ce fichier est exclusivement consommé
// par des tests, jamais bundlé côté client.
// ==============================================================================

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterEach, beforeEach } from "vitest";

import { env } from "@/server/infrastructure/env";
import * as schema from "@/server/infrastructure/db/schema";

export interface TestDbContext {
  readonly sql: postgres.Sql;
  readonly db: ReturnType<typeof drizzle<typeof schema>>;
  readonly close: () => Promise<void>;
}

/** Crée une connexion BD dédiée au test (max:1, isolation garantie).
 *  Appeler dans `beforeAll`, fermer dans `afterAll` via `ctx.close()`. */
export function createTestDb(): TestDbContext {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql, { schema, casing: "snake_case" });
  return { sql, db, close: () => sql.end() };
}

export interface TransactionalTestsOptions {
  /** Phase 16 — DETTE-LIC-018 : tables à TRUNCATE au début de chaque test
   *  (à l'intérieur de la transaction, donc rollback-safe). Permet d'isoler
   *  les specs des données committées par `pnpm db:seed` qui survivent au
   *  ROLLBACK racine.
   *
   *  Convention : utiliser TRUNCATE ... CASCADE pour gérer les FK. Les tables
   *  bootstrap (lic_users SYSTEM seedé en migration 0000) ne doivent PAS
   *  apparaître ici (seed minimal est nécessaire pour les FK cree_par/etc.).
   *
   *  Exemple : `setupTransactionalTests(ctx, { cleanTables: ["lic_pays_ref"] })` */
  readonly cleanTables?: readonly string[];
}

/** Wrap chaque test dans BEGIN; ... ROLLBACK;.
 *
 *  Pré-requis : `ctx.sql` configuré max:1 (sinon des requêtes peuvent partir
 *  sur d'autres connexions et échapper à la transaction).
 *
 *  Drizzle `db.transaction()` au sein d'un test → SAVEPOINT (transaction
 *  imbriquée), également annulé par le ROLLBACK racine.
 *
 *  Phase 16 — Option `cleanTables` : isole les tables référentielles polluées
 *  par `pnpm db:seed` (DETTE-LIC-018 résolue). TRUNCATE exécuté APRÈS BEGIN
 *  donc rolled back en fin de test — pas de pollution cross-tests. */
export function setupTransactionalTests(
  ctx: TestDbContext,
  options: TransactionalTestsOptions = {},
): void {
  beforeEach(async () => {
    await ctx.sql.unsafe("BEGIN");
    if (options.cleanTables !== undefined && options.cleanTables.length > 0) {
      // TRUNCATE all listed tables in a single statement (atomic, ordering-safe via CASCADE).
      const sqlIdentList = options.cleanTables.map((t) => `"${t}"`).join(", ");
      await ctx.sql.unsafe(`TRUNCATE TABLE ${sqlIdentList} CASCADE`);
    }
  });
  afterEach(async () => {
    await ctx.sql.unsafe("ROLLBACK");
  });
}
