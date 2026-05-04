// ==============================================================================
// LIC v2 — Composition root du module article (Phase 6 étape 6.B)
//
// CreateArticleUseCase est cross-module (dépend de ProduitRepository pour
// vérifier l'existence du parent). Câblé directement ici via import du
// produit.module — pattern toléré : c'est un référentiel paramétrable
// (sans audit), pas une mutation métier nécessitant le composition-root global.
// ==============================================================================

import { produitRepository } from "@/server/modules/produit/produit.module";

import { ArticleRepositoryPg } from "./adapters/postgres/article.repository.pg";
import { CreateArticleUseCase } from "./application/create-article.usecase";
import { GetArticleUseCase } from "./application/get-article.usecase";
import { ListArticlesUseCase } from "./application/list-articles.usecase";
import { ToggleArticleUseCase } from "./application/toggle-article.usecase";
import { UpdateArticleUseCase } from "./application/update-article.usecase";
import type { ArticleRepository } from "./ports/article.repository";

export const articleRepository: ArticleRepository = new ArticleRepositoryPg();

export const listArticlesUseCase = new ListArticlesUseCase(articleRepository);
export const getArticleUseCase = new GetArticleUseCase(articleRepository);
export const createArticleUseCase = new CreateArticleUseCase(articleRepository, produitRepository);
export const updateArticleUseCase = new UpdateArticleUseCase(articleRepository);
export const toggleArticleUseCase = new ToggleArticleUseCase(articleRepository);
