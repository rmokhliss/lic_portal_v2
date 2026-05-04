// ==============================================================================
// LIC v2 — ListArticlesByLicenceUseCase (Phase 6 étape 6.C)
// Read-only. Dénormalise avec ArticleDTO + ProduitDTO du parent.
// ==============================================================================

import {
  toDTO as articleToDTO,
  type ArticleDTO,
} from "@/server/modules/article/adapters/postgres/article.mapper";
import type { ArticleRepository } from "@/server/modules/article/ports/article.repository";

import { toDTO, type LicenceArticleDTO } from "../adapters/postgres/licence-article.mapper";
import type { LicenceArticleRepository } from "../ports/licence-article.repository";

export interface LicenceArticleWithArticleDTO {
  readonly liaison: LicenceArticleDTO;
  readonly article: ArticleDTO | null;
}

export class ListArticlesByLicenceUseCase {
  constructor(
    private readonly licenceArticleRepository: LicenceArticleRepository,
    private readonly articleRepository: ArticleRepository,
  ) {}

  async execute(licenceId: string): Promise<readonly LicenceArticleWithArticleDTO[]> {
    const liaisons = await this.licenceArticleRepository.findByLicence(licenceId);
    const result: LicenceArticleWithArticleDTO[] = [];
    for (const liaison of liaisons) {
      const article = await this.articleRepository.findById(liaison.articleId);
      result.push({
        liaison: toDTO(liaison),
        article: article === null ? null : articleToDTO(article),
      });
    }
    return result;
  }
}
