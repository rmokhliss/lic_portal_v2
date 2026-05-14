// ==============================================================================
// LIC v2 — Adapter Postgres SettingRepository (Phase 2.B étape 7/7)
//
// 2 méthodes du port. DI optionnelle de `db` en constructor pour les tests
// d'intégration (BEGIN/ROLLBACK via setupTransactionalTests).
//
// upsertMany utilise INSERT ... ON CONFLICT (key) DO UPDATE — un seul
// statement Postgres par batch, atomique sans transaction explicite.
// ==============================================================================

import { asc, eq, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";

import type { Setting } from "../../domain/setting.entity";
import {
  SettingRepository,
  type DbOrTx,
  type SettingUpsertEntry,
} from "../../ports/setting.repository";

import { rowToSetting } from "./setting.mapper";
import { settings } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class SettingRepositoryPg extends SettingRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findAll(tx?: DbOrTx): Promise<readonly Setting[]> {
    const conn = tx ?? this.db;
    const rows = await conn.select().from(settings).orderBy(asc(settings.key));
    return rows.map(rowToSetting);
  }

  async upsertMany(
    entries: readonly SettingUpsertEntry[],
    updatedBy: string,
    tx?: DbOrTx,
  ): Promise<void> {
    if (entries.length === 0) return;
    const conn = tx ?? this.db;
    const values = entries.map((e) => ({
      key: e.key,
      value: e.value,
      updatedBy,
    }));
    await conn
      .insert(settings)
      .values(values)
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: sql`excluded.value`,
          updatedBy: sql`excluded.updated_by`,
          updatedAt: sql`now()`,
        },
      });
  }

  async deleteByKey(key: string, tx?: DbOrTx): Promise<void> {
    const conn = tx ?? this.db;
    await conn.delete(settings).where(eq(settings.key, key));
  }
}
