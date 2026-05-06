// ==============================================================================
// LIC v2 — Adapter Postgres FichierLogRepository (Phase 10.B)
// ==============================================================================

import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { FichierLog, PersistedFichierLog } from "../../domain/fichier-log.entity";
import {
  type DbTransaction,
  type FindAllFichiersFilters,
  FichierLogRepository,
} from "../../ports/fichier-log.repository";

import { toEntity } from "./fichier-log.mapper";
import { fichiersLog } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class FichierLogRepositoryPg extends FichierLogRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async save(entity: FichierLog, tx?: DbTransaction): Promise<PersistedFichierLog> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target
      .insert(fichiersLog)
      .values({
        licenceId: entity.licenceId,
        type: entity.type,
        statut: entity.statut,
        path: entity.path,
        hash: entity.hash,
        metadata: entity.metadata,
        errorMessage: entity.errorMessage,
        creePar: entity.creePar,
      })
      .returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_fichiers_log n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedFichierLog[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(fichiersLog)
      .where(eq(fichiersLog.licenceId, licenceId))
      .orderBy(desc(fichiersLog.createdAt));
    return rows.map(toEntity);
  }

  async findAllRecent(
    filters: FindAllFichiersFilters = {},
    tx?: DbTransaction,
  ): Promise<readonly PersistedFichierLog[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const conditions: SQL[] = [];
    if (filters.type !== undefined) conditions.push(eq(fichiersLog.type, filters.type));
    if (filters.statut !== undefined) conditions.push(eq(fichiersLog.statut, filters.statut));
    if (filters.since !== undefined) conditions.push(gte(fichiersLog.createdAt, filters.since));
    if (filters.until !== undefined) conditions.push(lte(fichiersLog.createdAt, filters.until));

    const limit = filters.limit ?? 200;
    const query = target.select().from(fichiersLog);
    const rows = await (conditions.length > 0
      ? query
          .where(and(...conditions))
          .orderBy(desc(fichiersLog.createdAt))
          .limit(limit)
      : query.orderBy(desc(fichiersLog.createdAt)).limit(limit));
    return rows.map(toEntity);
  }
}
