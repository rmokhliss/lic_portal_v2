// ==============================================================================
// LIC v2 — Composition root du module licence-article (Phase 6 étape 6.C)
// Read-only câblé ici (List). Mutateurs dans composition-root.ts.
// ==============================================================================

import { articleRepository } from "@/server/modules/article/article.module";

import { LicenceArticleRepositoryPg } from "./adapters/postgres/licence-article.repository.pg";
import { ListArticlesByLicenceUseCase } from "./application/list-articles-by-licence.usecase";
import type { LicenceArticleRepository } from "./ports/licence-article.repository";

export const licenceArticleRepository: LicenceArticleRepository = new LicenceArticleRepositoryPg();

export const listArticlesByLicenceUseCase = new ListArticlesByLicenceUseCase(
  licenceArticleRepository,
  articleRepository,
);
