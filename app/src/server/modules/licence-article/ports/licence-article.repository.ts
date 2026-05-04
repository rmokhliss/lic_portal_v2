// ==============================================================================
// LIC v2 — Port LicenceArticleRepository (Phase 6 étape 6.C)
// ==============================================================================

import type { LicenceArticle, PersistedLicenceArticle } from "../domain/licence-article.entity";

export type DbTransaction = unknown;

export abstract class LicenceArticleRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedLicenceArticle | null>;

  abstract findByLicenceArticle(
    licenceId: string,
    articleId: number,
    tx?: DbTransaction,
  ): Promise<PersistedLicenceArticle | null>;

  abstract findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedLicenceArticle[]>;

  abstract save(
    entity: LicenceArticle,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedLicenceArticle>;

  abstract updateVolume(
    entity: PersistedLicenceArticle,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<void>;

  abstract delete(id: string, tx?: DbTransaction): Promise<void>;
}
