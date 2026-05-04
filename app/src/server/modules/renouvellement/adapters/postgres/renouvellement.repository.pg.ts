// ==============================================================================
// LIC v2 — Adapter Postgres RenouvellementRepository (Phase 5 + Phase 9.B)
// ==============================================================================

import { and, desc, eq, gte, lt, lte, or, type SQL } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import { decodeCursor, encodeCursor } from "@/server/infrastructure/db/cursor";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";
import { licences } from "@/server/modules/licence/adapters/postgres/schema";

import type { PersistedRenouvellement, Renouvellement } from "../../domain/renouvellement.entity";
import {
  type DbTransaction,
  type RenouvellementPage,
  RenouvellementRepository,
  type SearchRenouvellementsFilters,
} from "../../ports/renouvellement.repository";

import { rowToEntity } from "./renouvellement.mapper";
import { renouvellements } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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

  async searchPaginated(
    filters: SearchRenouvellementsFilters,
    tx?: DbTransaction,
  ): Promise<RenouvellementPage> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const conds: SQL[] = [];
    if (filters.status !== undefined) conds.push(eq(renouvellements.status, filters.status));
    if (filters.fromDate !== undefined) {
      conds.push(gte(renouvellements.createdAt, filters.fromDate));
    }
    if (filters.toDate !== undefined) {
      conds.push(lte(renouvellements.createdAt, filters.toDate));
    }
    if (filters.cursor !== undefined) {
      const { timestamp, id } = decodeCursor(filters.cursor);
      const cursorCond = or(
        lt(renouvellements.createdAt, timestamp),
        and(eq(renouvellements.createdAt, timestamp), lt(renouvellements.id, id)),
      );
      if (cursorCond !== undefined) conds.push(cursorCond);
    }
    if (filters.clientId !== undefined) {
      conds.push(eq(licences.clientId, filters.clientId));
    }

    // JOIN licences quand on filtre par clientId — sinon on évite le JOIN.
    const baseQuery =
      filters.clientId !== undefined
        ? target
            .select({ row: renouvellements })
            .from(renouvellements)
            .innerJoin(licences, eq(renouvellements.licenceId, licences.id))
        : target.select({ row: renouvellements }).from(renouvellements);

    const filtered = conds.length === 0 ? baseQuery : baseQuery.where(and(...conds));
    const rows = await filtered
      .orderBy(desc(renouvellements.createdAt), desc(renouvellements.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => rowToEntity(r.row));
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.dateCreation, last.id) : null;

    return { items, nextCursor };
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
