// ==============================================================================
// LIC v2 — Adapter Postgres RenouvellementRepository (Phase 5)
// ==============================================================================

import { desc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { PersistedRenouvellement, Renouvellement } from "../../domain/renouvellement.entity";
import {
  type DbTransaction,
  RenouvellementRepository,
} from "../../ports/renouvellement.repository";

import { rowToEntity } from "./renouvellement.mapper";
import { renouvellements } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class RenouvellementRepositoryPg extends RenouvellementRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedRenouvellement | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(renouvellements)
      .where(eq(renouvellements.id, id))
      .limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedRenouvellement[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(renouvellements)
      .where(eq(renouvellements.licenceId, licenceId))
      .orderBy(desc(renouvellements.createdAt));
    return rows.map(rowToEntity);
  }

  async save(
    renouvellement: Renouvellement,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedRenouvellement> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const inserted = await target
      .insert(renouvellements)
      .values({
        licenceId: renouvellement.licenceId,
        nouvelleDateDebut: renouvellement.nouvelleDateDebut,
        nouvelleDateFin: renouvellement.nouvelleDateFin,
        status: renouvellement.status,
        commentaire: renouvellement.commentaire,
        valideePar: renouvellement.valideePar,
        dateValidation: renouvellement.dateValidation,
        creePar: actorId,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_renouvellements n'a retourné aucune ligne",
      });
    }
    return rowToEntity(row);
  }

  async update(renouvellement: PersistedRenouvellement, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(renouvellements)
      .set({
        nouvelleDateDebut: renouvellement.nouvelleDateDebut,
        nouvelleDateFin: renouvellement.nouvelleDateFin,
        status: renouvellement.status,
        commentaire: renouvellement.commentaire,
        valideePar: renouvellement.valideePar,
        dateValidation: renouvellement.dateValidation,
      })
      .where(eq(renouvellements.id, renouvellement.id));
  }
}
