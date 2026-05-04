// ==============================================================================
// LIC v2 — UpdateArticleUseCase (Phase 6 étape 6.B)
//
// Patch partiel sur lookup id : nom, description, uniteVolume.
// produitId et code immuables (FK targets). actif via toggle.
// ==============================================================================

import { toDTO, type ArticleDTO } from "../adapters/postgres/article.mapper";
import { articleNotFoundById } from "../domain/article.errors";
import type { ArticleRepository } from "../ports/article.repository";

export interface UpdateArticleUseCaseInput {
  readonly id: number;
  readonly nom?: string;
  readonly description?: string | null;
  readonly uniteVolume?: string;
}

export class UpdateArticleUseCase {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async execute(input: UpdateArticleUseCaseInput): Promise<ArticleDTO> {
    const existing = await this.articleRepository.findById(input.id);
    if (existing === null) throw articleNotFoundById(input.id);

    let updated = existing;
    if (input.nom !== undefined) updated = updated.withName(input.nom);
    if ("description" in input) updated = updated.withDescription(input.description);
    if (input.uniteVolume !== undefined) updated = updated.withUniteVolume(input.uniteVolume);

    await this.articleRepository.update(updated);
    return toDTO(updated);
  }
}
