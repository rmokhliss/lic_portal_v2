// ==============================================================================
// LIC v2 — ToggleArticleUseCase (Phase 6 étape 6.B)
// ==============================================================================

import { toDTO, type ArticleDTO } from "../adapters/postgres/article.mapper";
import { articleNotFoundById } from "../domain/article.errors";
import type { ArticleRepository } from "../ports/article.repository";

export class ToggleArticleUseCase {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async execute(id: number): Promise<ArticleDTO> {
    const existing = await this.articleRepository.findById(id);
    if (existing === null) throw articleNotFoundById(id);

    const toggled = existing.toggle();
    await this.articleRepository.update(toggled);
    return toDTO(toggled);
  }
}
