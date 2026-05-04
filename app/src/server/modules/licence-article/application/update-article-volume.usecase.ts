// ==============================================================================
// LIC v2 — UpdateArticleVolumeUseCase (Phase 6 étape 6.C)
//
// Met à jour volumeAutorise (et/ou volumeConsomme — admin uniquement, en
// pratique le job snapshot Phase 8 le recalcule).
//
// Audit LICENCE_ARTICLE_VOLUME_UPDATED dans même tx (L3) avec before/after.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type LicenceArticleDTO } from "../adapters/postgres/licence-article.mapper";
import { LicenceArticle, type PersistedLicenceArticle } from "../domain/licence-article.entity";
import { licenceArticleNotFoundById } from "../domain/licence-article.errors";
import type { LicenceArticleRepository } from "../ports/licence-article.repository";

export interface UpdateArticleVolumeInput {
  readonly id: string;
  readonly volumeAutorise?: number;
  readonly volumeConsomme?: number;
}

export class UpdateArticleVolumeUseCase {
  constructor(
    private readonly licenceArticleRepository: LicenceArticleRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: UpdateArticleVolumeInput, actorId: string): Promise<LicenceArticleDTO> {
    const persisted = await db.transaction(async (tx) => {
      const existing = await this.licenceArticleRepository.findById(input.id, tx);
      if (existing === null) throw licenceArticleNotFoundById(input.id);

      let updated: PersistedLicenceArticle = existing;
      if (input.volumeAutorise !== undefined) {
        updated = updated.withVolumeAutorise(input.volumeAutorise);
      }
      if (input.volumeConsomme !== undefined) {
        LicenceArticle.validateVolume(input.volumeConsomme);
        // Pas de wither pour consomme — c'est une dénormalisation admin.
        updated = LicenceArticle.rehydrate({
          id: updated.id,
          licenceId: updated.licenceId,
          articleId: updated.articleId,
          volumeAutorise: updated.volumeAutorise,
          volumeConsomme: input.volumeConsomme,
          creePar: updated.creePar,
          modifiePar: updated.modifiePar,
        });
      }

      await this.licenceArticleRepository.updateVolume(updated, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "licence-article",
        entityId: updated.id,
        action: "LICENCE_ARTICLE_VOLUME_UPDATED",
        beforeData: existing.toAuditSnapshot(),
        afterData: updated.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return updated;
    });

    return toDTO(persisted);
  }
}
