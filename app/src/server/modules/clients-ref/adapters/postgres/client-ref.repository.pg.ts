// ==============================================================================
// LIC v2 — Adapter Postgres ClientRefRepository (Phase 24)
// ==============================================================================

import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";

import type { ClientRef } from "../../domain/client-ref.entity";
import {
  ClientRefRepository,
  type DbTransaction,
  type FindPaginatedClientsRefOptions,
  type FindPaginatedClientsRefResult,
  type SearchClientsRefOptions,
} from "../../ports/client-ref.repository";

import { toEntity } from "./client-ref.mapper";
import { clientsRef } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const DEFAULT_PAGE_LIMIT = 50;
const SEARCH_MAX_LIMIT = 20;

export class ClientRefRepositoryPg extends ClientRefRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findPaginated(
    opts: FindPaginatedClientsRefOptions = {},
    tx?: DbTransaction,
  ): Promise<FindPaginatedClientsRefResult> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = opts.limit ?? DEFAULT_PAGE_LIMIT;
    const offset = opts.offset ?? 0;
    const whereExpr = opts.actif === undefined ? undefined : eq(clientsRef.actif, opts.actif);

    const itemsQuery = target.select().from(clientsRef);
    const items = await (whereExpr ? itemsQuery.where(whereExpr) : itemsQuery)
      .orderBy(asc(clientsRef.codeClient))
      .limit(limit)
      .offset(offset);

    const totalQuery = target.select({ value: count() }).from(clientsRef);
    const totalRows = await (whereExpr ? totalQuery.where(whereExpr) : totalQuery);
    const total = totalRows[0]?.value ?? 0;

    return { items: items.map(toEntity), total };
  }

  async findByCode(codeClient: string, tx?: DbTransaction): Promise<ClientRef | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(clientsRef)
      .where(eq(clientsRef.codeClient, codeClient))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async search(opts: SearchClientsRefOptions, tx?: DbTransaction): Promise<readonly ClientRef[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = Math.min(opts.limit ?? SEARCH_MAX_LIMIT, SEARCH_MAX_LIMIT);
    const q = opts.query.trim();
    if (q.length === 0) return [];
    const pattern = `%${q}%`;

    const whereExpr =
      opts.actif === undefined
        ? or(ilike(clientsRef.codeClient, pattern), ilike(clientsRef.raisonSociale, pattern))
        : and(
            eq(clientsRef.actif, opts.actif),
            or(ilike(clientsRef.codeClient, pattern), ilike(clientsRef.raisonSociale, pattern)),
          );

    const rows = await target
      .select()
      .from(clientsRef)
      .where(whereExpr)
      // Priorité aux matches qui démarrent par le code, puis ordre alpha.
      .orderBy(
        sql`CASE WHEN ${clientsRef.codeClient} ILIKE ${`${q}%`} THEN 0 ELSE 1 END`,
        asc(clientsRef.codeClient),
      )
      .limit(limit);

    return rows.map(toEntity);
  }
}
