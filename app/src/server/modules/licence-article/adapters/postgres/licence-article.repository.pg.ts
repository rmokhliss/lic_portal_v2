// ==============================================================================
// LIC v2 — Adapter Postgres LicenceArticleRepository (Phase 6 étape 6.C)
// ==============================================================================

import { and, asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { LicenceArticle, PersistedLicenceArticle } from "../../domain/licence-article.entity";
import {
  type DbTransaction,
  LicenceArticleRepository,
} from "../../ports/licence-article.repository";

import { toEntity } from "./licence-article.mapper";
import { licenceArticles } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class LicenceArticleRepositoryPg extends LicenceArticleRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedLicenceArticle | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(licenceArticles)
      .where(eq(licenceArticles.id, id))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByLicenceArticle(
    licenceId: string,
    articleId: number,
    tx?: DbTransaction,
  ): Promise<PersistedLicenceArticle | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(licenceArticles)
      .where(
        and(eq(licenceArticles.licenceId, licenceId), eq(licenceArticles.articleId, articleId)),
      )
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedLicenceArticle[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(licenceArticles)
      .where(eq(licenceArticles.licenceId, licenceId))
      .orderBy(asc(licenceArticles.articleId));
    return rows.map(toEntity);
  }

  async save(
    entity: LicenceArticle,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedLicenceArticle> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target
      .insert(licenceArticles)
      .values({
        licenceId: entity.licenceId,
        articleId: entity.articleId,
        volumeAutorise: entity.volumeAutorise,
        volumeConsomme: entity.volumeConsomme,
        creePar: actorId,
        modifiePar: actorId,
      })
      .returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_licence_articles n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async updateVolume(
    entity: PersistedLicenceArticle,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(licenceArticles)
      .set({
        volumeAutorise: entity.volumeAutorise,
        volumeConsomme: entity.volumeConsomme,
        modifiePar: actorId,
        updatedAt: new Date(),
      })
      .where(eq(licenceArticles.id, entity.id));
  }

  async delete(id: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target.delete(licenceArticles).where(eq(licenceArticles.id, id));
  }
}
