// ==============================================================================
// LIC v2 — ListArticlesUseCase (Phase 6 étape 6.B)
// ==============================================================================

import { toDTO, type ArticleDTO } from "../adapters/postgres/article.mapper";
import type { ArticleRepository, FindAllArticlesOptions } from "../ports/article.repository";

export type ListArticlesInput = FindAllArticlesOptions;

export class ListArticlesUseCase {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async execute(input: ListArticlesInput = {}): Promise<readonly ArticleDTO[]> {
    const articles = await this.articleRepository.findAll(input);
    return articles.map(toDTO);
  }
}
