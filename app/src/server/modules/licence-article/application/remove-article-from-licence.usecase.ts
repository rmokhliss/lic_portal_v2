// ==============================================================================
// LIC v2 — RemoveArticleFromLicenceUseCase (Phase 6 étape 6.C)
// Audit LICENCE_ARTICLE_REMOVED dans même tx (L3). Supprime aussi via cascade
// l'historique de volumes ? Non — append-only, on conserve les snapshots
// passés (les FK sont sur licence_id/article_id, pas sur licence_articles.id).
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { licenceArticleNotFoundById } from "../domain/licence-article.errors";
import type { LicenceArticleRepository } from "../ports/licence-article.repository";

export interface RemoveArticleFromLicenceInput {
  readonly id: string;
}

export class RemoveArticleFromLicenceUseCase {
  constructor(
    private readonly licenceArticleRepository: LicenceArticleRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: RemoveArticleFromLicenceInput, actorId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const existing = await this.licenceArticleRepository.findById(input.id, tx);
      if (existing === null) throw licenceArticleNotFoundById(input.id);

      await this.licenceArticleRepository.delete(input.id, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "licence-article",
        entityId: existing.id,
        action: "LICENCE_ARTICLE_REMOVED",
        beforeData: existing.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);
    });
  }
}
