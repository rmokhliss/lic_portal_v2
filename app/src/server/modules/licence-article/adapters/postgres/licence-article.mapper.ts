// ==============================================================================
// LIC v2 — Mapper LicenceArticle (Phase 6 étape 6.C)
// ==============================================================================

import type { InferSelectModel } from "drizzle-orm";

import { LicenceArticle, type PersistedLicenceArticle } from "../../domain/licence-article.entity";

import type { licenceArticles } from "./schema";

type LicenceArticleRow = InferSelectModel<typeof licenceArticles>;

export interface LicenceArticleDTO {
  readonly id: string;
  readonly licenceId: string;
  readonly articleId: number;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
  readonly creePar: string | null;
  readonly modifiePar: string | null;
}

export function toEntity(row: LicenceArticleRow): PersistedLicenceArticle {
  return LicenceArticle.rehydrate({
    id: row.id,
    licenceId: row.licenceId,
    articleId: row.articleId,
    volumeAutorise: row.volumeAutorise,
    volumeConsomme: row.volumeConsomme,
    creePar: row.creePar,
    modifiePar: row.modifiePar,
  });
}

export function toDTO(entity: PersistedLicenceArticle): LicenceArticleDTO {
  return {
    id: entity.id,
    licenceId: entity.licenceId,
    articleId: entity.articleId,
    volumeAutorise: entity.volumeAutorise,
    volumeConsomme: entity.volumeConsomme,
    creePar: entity.creePar,
    modifiePar: entity.modifiePar,
  };
}
