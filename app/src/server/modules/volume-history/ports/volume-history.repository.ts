// ==============================================================================
// LIC v2 — Port VolumeHistoryRepository (Phase 6 étape 6.D)
//
// Cursor pagination via createdAt DESC + id DESC (snapshots monotones).
// ==============================================================================

import type {
  ArticleVolumeSnapshot,
  PersistedArticleVolumeSnapshot,
} from "../domain/article-volume-snapshot.entity";

export type DbTransaction = unknown;

export interface ListVolumeHistoryFilters {
  readonly licenceId?: string;
  readonly articleId?: number;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface VolumeHistoryPage {
  readonly items: readonly PersistedArticleVolumeSnapshot[];
  readonly nextCursor: string | null;
}

export abstract class VolumeHistoryRepository {
  abstract save(
    snapshot: ArticleVolumeSnapshot,
    tx?: DbTransaction,
  ): Promise<PersistedArticleVolumeSnapshot>;

  abstract findByLicenceArticlePeriode(
    licenceId: string,
    articleId: number,
    periode: Date,
    tx?: DbTransaction,
  ): Promise<PersistedArticleVolumeSnapshot | null>;

  abstract listPaginated(
    filters: ListVolumeHistoryFilters,
    tx?: DbTransaction,
  ): Promise<VolumeHistoryPage>;
}
