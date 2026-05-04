// ==============================================================================
// LIC v2 — Adapter Postgres ArticleRepository (Phase 6 étape 6.B)
// ==============================================================================

import { and, asc, eq, type SQL } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { Article, PersistedArticle } from "../../domain/article.entity";
import {
  ArticleRepository,
  type DbTransaction,
  type FindAllArticlesOptions,
} from "../../ports/article.repository";

import { toEntity, toPersistence } from "./article.mapper";
import { articlesRef } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class ArticleRepositoryPg extends ArticleRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findAll(
    opts?: FindAllArticlesOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedArticle[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    const conditions: SQL[] = [];
    if (opts?.actif !== undefined) conditions.push(eq(articlesRef.actif, opts.actif));
    if (opts?.produitId !== undefined) conditions.push(eq(articlesRef.produitId, opts.produitId));

    const baseQuery = target.select().from(articlesRef);
    const filtered = conditions.length === 0 ? baseQuery : baseQuery.where(and(...conditions));

    const rows = await filtered.orderBy(asc(articlesRef.produitId), asc(articlesRef.code));
    return rows.map(toEntity);
  }

  async findById(id: number, tx?: DbTransaction): Promise<PersistedArticle | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(articlesRef).where(eq(articlesRef.id, id)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByProduitCode(
    produitId: number,
    code: string,
    tx?: DbTransaction,
  ): Promise<PersistedArticle | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(articlesRef)
      .where(and(eq(articlesRef.produitId, produitId), eq(articlesRef.code, code)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(article: Article, tx?: DbTransaction): Promise<PersistedArticle> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target.insert(articlesRef).values(toPersistence(article)).returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_articles_ref n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async update(article: PersistedArticle, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(articlesRef)
      .set({
        nom: article.nom,
        description: article.description ?? null,
        uniteVolume: article.uniteVolume,
        actif: article.actif,
      })
      .where(eq(articlesRef.id, article.id));
  }
}
