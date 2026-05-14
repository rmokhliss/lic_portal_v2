// ==============================================================================
// LIC v2 — Port SettingRepository (Phase 2.B étape 7/7)
//
// Surface 2 méthodes (alignées Référentiel §4.12.2 abstract class) :
//   - findAll()              : retourne toutes les paires (k,v) — volume <50
//   - upsertMany(entries, by) : INSERT ... ON CONFLICT DO UPDATE par batch
//
// Pas de tx optionnel : pas d'audit cross-module (R-27 — table technique).
// upsertMany est atomique côté Postgres (un seul statement avec VALUES batch).
// ==============================================================================

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import type * as schema from "@/server/infrastructure/db/schema";

import type { Setting } from "../domain/setting.entity";

export interface SettingUpsertEntry {
  readonly key: string;
  readonly value: unknown;
}

/**
 * Type d'instance Drizzle (db top-level OU tx au sein d'une `db.transaction`).
 * Exposé pour permettre aux use-cases qui orchestrent settings + audit dans une
 * même transaction (Phase 3.C — CA generation) de passer le tx.
 *
 * On accepte les deux formes parce que `db.transaction(async (tx) => ...)`
 * passe un `PgTransaction`, distinct du `PostgresJsDatabase` top-level (lequel
 * a `$client`, contrairement au tx).
 */
export type DbOrTx =
  | PostgresJsDatabase<typeof schema>
  | PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;

export abstract class SettingRepository {
  abstract findAll(tx?: DbOrTx): Promise<readonly Setting[]>;

  abstract upsertMany(
    entries: readonly SettingUpsertEntry[],
    updatedBy: string,
    tx?: DbOrTx,
  ): Promise<void>;

  /** Phase 24 — suppression d'une clé (utilisé par delete-ca.usecase). */
  abstract deleteByKey(key: string, tx?: DbOrTx): Promise<void>;
}
