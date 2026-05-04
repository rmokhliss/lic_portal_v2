// ==============================================================================
// LIC v2 — GetArticleUseCase (Phase 6 étape 6.B)
// Lookup par id (FK target).
// ==============================================================================

import { toDTO, type ArticleDTO } from "../adapters/postgres/article.mapper";
import { Article } from "../domain/article.entity";
import { articleNotFoundById } from "../domain/article.errors";
import type { ArticleRepository } from "../ports/article.repository";

export class GetArticleUseCase {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async execute(id: number): Promise<ArticleDTO> {
    Article.validateProduitId(id);
    const article = await this.articleRepository.findById(id);
    if (article === null) throw articleNotFoundById(id);
    return toDTO(article);
  }
}
