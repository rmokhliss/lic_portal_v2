// ==============================================================================
// LIC v2 — Adapter Postgres AuditRepository (F-08, refactor F-07 AuditRecorder)
//
// 3 méthodes implémentées :
//   - save        : INSERT direct (search_vector GENERATED côté BD F-06)
//   - findById    : SELECT par PK
//   - search      : SELECT avec FTS + filtres + pagination cursor (LIMIT+1)
//
// DI optionnelle de db en constructor (default = singleton). Permet aux tests
// d'intégration BD d'injecter une connexion dédiée pour BEGIN/ROLLBACK.
// ==============================================================================

import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import { decodeCursor, encodeCursor } from "@/server/infrastructure/db/cursor";
import type * as schema from "@/server/infrastructure/db/schema";
import {
  type AuditEntry,
  type PersistedAuditEntry,
} from "@/server/modules/audit/domain/audit-entry.entity";
import {
  type AuditPage,
  AuditRepository,
  type DbTransaction,
  type SearchAuditFilters,
} from "@/server/modules/audit/ports/audit.repository";

import { auditLog } from "./schema";
import { fromDb, toDbInsert } from "./audit.mapper";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class AuditRepositoryPg extends AuditRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async save(entry: AuditEntry, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target.insert(auditLog).values(toDbInsert(entry));
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedAuditEntry | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(auditLog).where(eq(auditLog.id, id)).limit(1);
    return rows[0] ? fromDb(rows[0]) : null;
  }

  async search(filters: SearchAuditFilters, tx?: DbTransaction): Promise<AuditPage> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = filters.limit ?? 50;

    // Construction du WHERE dynamique. and([]) → undefined si aucun filtre.
    const conditions = [];

    if (filters.query !== undefined && filters.query !== "") {
      // FTS français : plainto_tsquery (ADR 0004). Match sur search_vector
      // GENERATED côté BD (F-06).
      conditions.push(sql`${auditLog.searchVector} @@ plainto_tsquery('french', ${filters.query})`);
    }
    if (filters.entity !== undefined) {
      conditions.push(eq(auditLog.entity, filters.entity));
    }
    if (filters.entityId !== undefined) {
      conditions.push(eq(auditLog.entityId, filters.entityId));
    }
    if (filters.userId !== undefined) {
      conditions.push(eq(auditLog.userId, filters.userId));
    }
    if (filters.clientId !== undefined) {
      conditions.push(eq(auditLog.clientId, filters.clientId));
    }
    if (filters.mode !== undefined) {
      conditions.push(eq(auditLog.mode, filters.mode));
    }
    if (filters.fromDate !== undefined) {
      conditions.push(gte(auditLog.createdAt, filters.fromDate));
    }
    if (filters.toDate !== undefined) {
      conditions.push(lte(auditLog.createdAt, filters.toDate));
    }

    // Cursor : uuidv7 contient le timestamp dans les premiers bits (RFC 9562)
    // → l'ORDER BY id DESC reflète déjà l'ordre chronologique inverse.
    // Pas de tie-breaker (cat, id) : la row-comparison PG est imprécise face
    // à la différence de précision JS Date (ms) vs PG TIMESTAMPTZ (microsec)
    // — bug observé F-08. Ordre id DESC seul suffit pour LIC mono-tenant.
    if (filters.cursor !== undefined) {
      const { id } = decodeCursor(filters.cursor);
      conditions.push(lt(auditLog.id, id));
    }

    // LIMIT + 1 : si on récupère limit+1 lignes, on sait qu'il y a une page
    // suivante (et on construit nextCursor à partir de la limit-ème).
    // ORDER BY id DESC seul (cf. note cursor ci-dessus). created_at DESC
    // conservé comme secondaire pour homogénéité visuelle si jamais id collide
    // (impossible PK + uuidv7).
    const rows = await target
      .select()
      .from(auditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = pageRows.map(fromDb);

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      if (last !== undefined) {
        nextCursor = encodeCursor(last.createdAt, last.id);
      }
    }

    return { items, nextCursor, effectiveLimit: limit };
  }
}
