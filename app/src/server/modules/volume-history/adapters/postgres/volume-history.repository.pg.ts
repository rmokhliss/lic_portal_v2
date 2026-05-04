// ==============================================================================
// LIC v2 — Adapter Postgres VolumeHistoryRepository (Phase 6 étape 6.D)
//
// Cursor pagination : ORDER BY (created_at DESC, id DESC) + tuple (created_at, id)
// strictement < curseur. Encodage via infrastructure/db/cursor.
// ==============================================================================

import { and, desc, eq, lt, or, sql, type SQL } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import { decodeCursor, encodeCursor } from "@/server/infrastructure/db/cursor";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type {
  ArticleVolumeSnapshot,
  PersistedArticleVolumeSnapshot,
} from "../../domain/article-volume-snapshot.entity";
import {
  type DbTransaction,
  type ListVolumeHistoryFilters,
  type VolumeHistoryPage,
  VolumeHistoryRepository,
} from "../../ports/volume-history.repository";

import { toEntity } from "./volume-history.mapper";
import { articleVolumeHistory } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class VolumeHistoryRepositoryPg extends VolumeHistoryRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async save(
    snapshot: ArticleVolumeSnapshot,
    tx?: DbTransaction,
  ): Promise<PersistedArticleVolumeSnapshot> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target
      .insert(articleVolumeHistory)
      .values({
        licenceId: snapshot.licenceId,
        articleId: snapshot.articleId,
        periode: snapshot.periode.toISOString().slice(0, 10),
        volumeAutorise: snapshot.volumeAutorise,
        volumeConsomme: snapshot.volumeConsomme,
      })
      .returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_article_volume_history n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async findByLicenceArticlePeriode(
    licenceId: string,
    articleId: number,
    periode: Date,
    tx?: DbTransaction,
  ): Promise<PersistedArticleVolumeSnapshot | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const periodeStr = periode.toISOString().slice(0, 10);
    const rows = await target
      .select()
      .from(articleVolumeHistory)
      .where(
        and(
          eq(articleVolumeHistory.licenceId, licenceId),
          eq(articleVolumeHistory.articleId, articleId),
          sql`${articleVolumeHistory.periode} = ${periodeStr}::date`,
        ),
      )
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async listPaginated(
    filters: ListVolumeHistoryFilters,
    tx?: DbTransaction,
  ): Promise<VolumeHistoryPage> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const conditions: SQL[] = [];
    if (filters.licenceId !== undefined) {
      conditions.push(eq(articleVolumeHistory.licenceId, filters.licenceId));
    }
    if (filters.articleId !== undefined) {
      conditions.push(eq(articleVolumeHistory.articleId, filters.articleId));
    }
    if (filters.cursor !== undefined) {
      const { timestamp, id } = decodeCursor(filters.cursor);
      const cursorCond = or(
        lt(articleVolumeHistory.createdAt, timestamp),
        and(eq(articleVolumeHistory.createdAt, timestamp), lt(articleVolumeHistory.id, id)),
      );
      if (cursorCond !== undefined) conditions.push(cursorCond);
    }

    const baseQuery = target.select().from(articleVolumeHistory);
    const filtered = conditions.length === 0 ? baseQuery : baseQuery.where(and(...conditions));

    const rows = await filtered
      .orderBy(desc(articleVolumeHistory.createdAt), desc(articleVolumeHistory.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(toEntity);
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

    return { items, nextCursor };
  }
}
