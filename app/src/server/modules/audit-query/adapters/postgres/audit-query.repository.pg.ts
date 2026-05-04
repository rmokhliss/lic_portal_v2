// ==============================================================================
// LIC v2 — Adapter Postgres AuditQueryRepository (Phase 7 étape 7.A)
//
// Le scope client/licence demande des sous-requêtes EXISTS sur les tables
// reliées. On utilise drizzle `sql` template pour rester sûrs des types.
// ==============================================================================

import { and, desc, eq, gte, lt, lte, sql, type SQL } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import { decodeCursor, encodeCursor } from "@/server/infrastructure/db/cursor";
import type * as schema from "@/server/infrastructure/db/schema";
import { auditLog } from "@/server/modules/audit/adapters/postgres/schema";
import { fromDb } from "@/server/modules/audit/adapters/postgres/audit.mapper";
import type { PersistedAuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";

import {
  type AuditPage,
  AuditQueryRepository,
  type AuditQueryFilters,
  type DbTransaction,
} from "../../ports/audit-query.repository";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function buildBaseConditions(filters: AuditQueryFilters): SQL[] {
  const conds: SQL[] = [];
  if (filters.query !== undefined && filters.query !== "") {
    conds.push(sql`${auditLog.searchVector} @@ plainto_tsquery('french', ${filters.query})`);
  }
  if (filters.action !== undefined) conds.push(eq(auditLog.action, filters.action));
  if (filters.userId !== undefined) conds.push(eq(auditLog.userId, filters.userId));
  if (filters.userDisplayLike !== undefined && filters.userDisplayLike !== "") {
    const pattern = `%${filters.userDisplayLike}%`;
    conds.push(sql`${auditLog.userDisplay} ILIKE ${pattern}`);
  }
  if (filters.entity !== undefined) conds.push(eq(auditLog.entity, filters.entity));
  if (filters.mode !== undefined) conds.push(eq(auditLog.mode, filters.mode));
  if (filters.fromDate !== undefined) conds.push(gte(auditLog.createdAt, filters.fromDate));
  if (filters.toDate !== undefined) conds.push(lte(auditLog.createdAt, filters.toDate));
  if (filters.cursor !== undefined) {
    const { id } = decodeCursor(filters.cursor);
    conds.push(lt(auditLog.id, id));
  }
  return conds;
}

function clampLimit(limit?: number): number {
  return Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
}

function paginatePage(rows: readonly (typeof auditLog.$inferSelect)[], limit: number): AuditPage {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = pageRows.map(fromDb) as readonly PersistedAuditEntry[];
  let nextCursor: string | null = null;
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    if (last !== undefined) {
      nextCursor = encodeCursor(last.createdAt, last.id);
    }
  }
  return { items, nextCursor, effectiveLimit: limit };
}

export class AuditQueryRepositoryPg extends AuditQueryRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async listByEntity(
    entity: string,
    entityId: string,
    filters: AuditQueryFilters = {},
    tx?: DbTransaction,
  ): Promise<AuditPage> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = clampLimit(filters.limit);
    const conds = [
      eq(auditLog.entity, entity),
      eq(auditLog.entityId, entityId),
      ...buildBaseConditions({ ...filters, entity: undefined }),
    ];
    const rows = await target
      .select()
      .from(auditLog)
      .where(and(...conds))
      .orderBy(desc(auditLog.id))
      .limit(limit + 1);
    return paginatePage(rows, limit);
  }

  async listByClientScope(
    clientId: string,
    filters: AuditQueryFilters = {},
    tx?: DbTransaction,
  ): Promise<AuditPage> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = clampLimit(filters.limit);

    // Scope client = OR de plusieurs prédicats :
    //   - audit.client_id = X (direct, pour les rares entités qui le posent)
    //   - entity='client' AND entity_id = X
    //   - entity='entite' AND entity_id IN (entites de X)
    //   - entity='contact' AND entity_id IN (contacts via entites de X)
    //   - entity='licence' AND entity_id IN (licences de X)
    //   - entity='renouvellement' AND entity_id IN (renouv via licences de X)
    //   - entity='licence-produit' AND entity_id IN (lic_produits via licences de X)
    //   - entity='licence-article' AND entity_id IN (lic_articles via licences de X)
    // Note types : audit.entity_id est `uuid`. Les sous-requêtes retournent
    // donc des `uuid` (pas `id::text`) — `IN (uuid)` matche `uuid` natif.
    const scopeOr = sql`(
      ${auditLog.clientId} = ${clientId}::uuid
      OR (${auditLog.entity} = 'client' AND ${auditLog.entityId} = ${clientId}::uuid)
      OR (${auditLog.entity} = 'entite' AND ${auditLog.entityId} IN (
        SELECT id FROM lic_entites WHERE client_id = ${clientId}::uuid
      ))
      OR (${auditLog.entity} = 'contact' AND ${auditLog.entityId} IN (
        SELECT cc.id FROM lic_contacts_clients cc
        JOIN lic_entites e ON cc.entite_id = e.id
        WHERE e.client_id = ${clientId}::uuid
      ))
      OR (${auditLog.entity} = 'licence' AND ${auditLog.entityId} IN (
        SELECT id FROM lic_licences WHERE client_id = ${clientId}::uuid
      ))
      OR (${auditLog.entity} = 'renouvellement' AND ${auditLog.entityId} IN (
        SELECT r.id FROM lic_renouvellements r
        JOIN lic_licences l ON r.licence_id = l.id
        WHERE l.client_id = ${clientId}::uuid
      ))
      OR (${auditLog.entity} = 'licence-produit' AND ${auditLog.entityId} IN (
        SELECT lp.id FROM lic_licence_produits lp
        JOIN lic_licences l ON lp.licence_id = l.id
        WHERE l.client_id = ${clientId}::uuid
      ))
      OR (${auditLog.entity} = 'licence-article' AND ${auditLog.entityId} IN (
        SELECT la.id FROM lic_licence_articles la
        JOIN lic_licences l ON la.licence_id = l.id
        WHERE l.client_id = ${clientId}::uuid
      ))
    )`;

    const conds = [scopeOr, ...buildBaseConditions(filters)];
    const rows = await target
      .select()
      .from(auditLog)
      .where(and(...conds))
      .orderBy(desc(auditLog.id))
      .limit(limit + 1);
    return paginatePage(rows, limit);
  }

  async listByLicenceScope(
    licenceId: string,
    filters: AuditQueryFilters = {},
    tx?: DbTransaction,
  ): Promise<AuditPage> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = clampLimit(filters.limit);

    const scopeOr = sql`(
      (${auditLog.entity} = 'licence' AND ${auditLog.entityId} = ${licenceId}::uuid)
      OR (${auditLog.entity} = 'renouvellement' AND ${auditLog.entityId} IN (
        SELECT id FROM lic_renouvellements WHERE licence_id = ${licenceId}::uuid
      ))
      OR (${auditLog.entity} = 'licence-produit' AND ${auditLog.entityId} IN (
        SELECT id FROM lic_licence_produits WHERE licence_id = ${licenceId}::uuid
      ))
      OR (${auditLog.entity} = 'licence-article' AND ${auditLog.entityId} IN (
        SELECT id FROM lic_licence_articles WHERE licence_id = ${licenceId}::uuid
      ))
    )`;

    const conds = [scopeOr, ...buildBaseConditions(filters)];
    const rows = await target
      .select()
      .from(auditLog)
      .where(and(...conds))
      .orderBy(desc(auditLog.id))
      .limit(limit + 1);
    return paginatePage(rows, limit);
  }

  async search(filters: AuditQueryFilters, tx?: DbTransaction): Promise<AuditPage> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = clampLimit(filters.limit);
    const conds = buildBaseConditions(filters);
    const rows = await target
      .select()
      .from(auditLog)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(auditLog.id))
      .limit(limit + 1);
    return paginatePage(rows, limit);
  }

  async count(filters: AuditQueryFilters, tx?: DbTransaction): Promise<number> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    // count() ignore le cursor (la pagination ne s'applique pas).
    const { cursor: _cursor, limit: _limit, ...countableFilters } = filters;
    void _cursor;
    void _limit;
    const conds = buildBaseConditions(countableFilters);
    const rows = await target
      .select({ count: sql<string>`count(*)::text` })
      .from(auditLog)
      .where(conds.length > 0 ? and(...conds) : undefined);
    return Number(rows[0]?.count ?? "0");
  }
}
