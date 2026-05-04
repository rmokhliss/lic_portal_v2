// ==============================================================================
// LIC v2 — Port ArticleRepository (Phase 6 étape 6.B)
//
// findById : utilisé par licence-article (FK vérification existence + actif).
// findByProduit : pour SelectArticleDialog côté UI.
// findByProduitCode : pour idempotent seed (lookup business).
// findAll(opts) : avec filtre actif et produitId optionnels (UI catalogue).
// ==============================================================================

import type { Article, PersistedArticle } from "../domain/article.entity";

export type DbTransaction = unknown;

export interface FindAllArticlesOptions {
  readonly actif?: boolean;
  readonly produitId?: number;
}

export abstract class ArticleRepository {
  abstract findAll(
    opts?: FindAllArticlesOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedArticle[]>;

  abstract findById(id: number, tx?: DbTransaction): Promise<PersistedArticle | null>;

  abstract findByProduitCode(
    produitId: number,
    code: string,
    tx?: DbTransaction,
  ): Promise<PersistedArticle | null>;

  abstract save(article: Article, tx?: DbTransaction): Promise<PersistedArticle>;

  abstract update(article: PersistedArticle, tx?: DbTransaction): Promise<void>;
}
