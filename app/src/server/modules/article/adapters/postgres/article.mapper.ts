// ==============================================================================
// LIC v2 — Mapper Article (Phase 6 étape 6.B)
// ==============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { Article, type PersistedArticle } from "../../domain/article.entity";

import type { articlesRef } from "./schema";

type ArticleRow = InferSelectModel<typeof articlesRef>;
type ArticleInsert = InferInsertModel<typeof articlesRef>;

export interface ArticleDTO {
  readonly id: number;
  readonly produitId: number;
  readonly code: string;
  readonly nom: string;
  readonly description: string | null;
  readonly uniteVolume: string;
  readonly actif: boolean;
}

export function toEntity(row: ArticleRow): PersistedArticle {
  return Article.rehydrate({
    id: row.id,
    produitId: row.produitId,
    code: row.code,
    nom: row.nom,
    description: row.description ?? undefined,
    uniteVolume: row.uniteVolume,
    actif: row.actif,
  });
}

export function toDTO(entity: PersistedArticle): ArticleDTO {
  return {
    id: entity.id,
    produitId: entity.produitId,
    code: entity.code,
    nom: entity.nom,
    description: entity.description ?? null,
    uniteVolume: entity.uniteVolume,
    actif: entity.actif,
  };
}

export function toPersistence(entity: Article): ArticleInsert {
  return {
    produitId: entity.produitId,
    code: entity.code,
    nom: entity.nom,
    description: entity.description ?? null,
    uniteVolume: entity.uniteVolume,
    actif: entity.actif,
  };
}
