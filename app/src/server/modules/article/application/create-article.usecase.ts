// ==============================================================================
// LIC v2 — CreateArticleUseCase (Phase 6 étape 6.B)
//
// Vérifie l'existence du produit parent (lookup ProduitRepository) avant
// d'insérer. Sans audit (R-27). UNIQUE BD garantit la non-duplication finale.
// ==============================================================================

import { produitNotFoundById } from "@/server/modules/produit/domain/produit.errors";
import type { ProduitRepository } from "@/server/modules/produit/ports/produit.repository";

import { toDTO, type ArticleDTO } from "../adapters/postgres/article.mapper";
import { Article, type CreateArticleInput as DomainInput } from "../domain/article.entity";
import { articleCodeAlreadyExists } from "../domain/article.errors";
import type { ArticleRepository } from "../ports/article.repository";

export type CreateArticleUseCaseInput = DomainInput;

export class CreateArticleUseCase {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly produitRepository: ProduitRepository,
  ) {}

  async execute(input: CreateArticleUseCaseInput): Promise<ArticleDTO> {
    const article = Article.create(input);

    const produit = await this.produitRepository.findById(article.produitId);
    if (produit === null) throw produitNotFoundById(article.produitId);

    const existing = await this.articleRepository.findByProduitCode(
      article.produitId,
      article.code,
    );
    if (existing !== null) throw articleCodeAlreadyExists(article.produitId, article.code);

    const persisted = await this.articleRepository.save(article);
    return toDTO(persisted);
  }
}
