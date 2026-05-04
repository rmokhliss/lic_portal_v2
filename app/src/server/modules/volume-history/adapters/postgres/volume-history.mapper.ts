// ==============================================================================
// LIC v2 — Mapper VolumeHistory (Phase 6 étape 6.D)
//
// `periode` BD = DATE (sans heure). Côté PG-js elle revient en string
// "YYYY-MM-DD" — on parse en Date côté entité.
// ==============================================================================

import type { InferSelectModel } from "drizzle-orm";

import {
  ArticleVolumeSnapshot,
  type PersistedArticleVolumeSnapshot,
} from "../../domain/article-volume-snapshot.entity";

import type { articleVolumeHistory } from "./schema";

type SnapshotRow = InferSelectModel<typeof articleVolumeHistory>;

export interface VolumeHistoryDTO {
  readonly id: string;
  readonly licenceId: string;
  readonly articleId: number;
  /** ISO YYYY-MM-DD (date pure, pas un timestamp). */
  readonly periode: string;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
  readonly snapshotAt: string;
}

export function toEntity(row: SnapshotRow): PersistedArticleVolumeSnapshot {
  // `periode` Drizzle date mode default = string "YYYY-MM-DD" — on convertit.
  const periode = typeof row.periode === "string" ? new Date(row.periode) : row.periode;
  return ArticleVolumeSnapshot.rehydrate({
    id: row.id,
    licenceId: row.licenceId,
    articleId: row.articleId,
    periode,
    volumeAutorise: row.volumeAutorise,
    volumeConsomme: row.volumeConsomme,
    snapshotAt: row.snapshotAt,
    createdAt: row.createdAt,
  });
}

export function toDTO(entity: PersistedArticleVolumeSnapshot): VolumeHistoryDTO {
  return {
    id: entity.id,
    licenceId: entity.licenceId,
    articleId: entity.articleId,
    periode: entity.periode.toISOString().slice(0, 10),
    volumeAutorise: entity.volumeAutorise,
    volumeConsomme: entity.volumeConsomme,
    snapshotAt: entity.snapshotAt.toISOString(),
  };
}
