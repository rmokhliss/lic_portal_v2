// ==============================================================================
// LIC v2 — AddArticleToLicenceUseCase (Phase 6 étape 6.C)
// Audit LICENCE_ARTICLE_ADDED dans même tx (L3).
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { articleNotFoundById } from "@/server/modules/article/domain/article.errors";
import type { ArticleRepository } from "@/server/modules/article/ports/article.repository";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import { licenceNotFoundById } from "@/server/modules/licence/domain/licence.errors";
import type { LicenceRepository } from "@/server/modules/licence/ports/licence.repository";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type LicenceArticleDTO } from "../adapters/postgres/licence-article.mapper";
import { LicenceArticle } from "../domain/licence-article.entity";
import { licenceArticleAlreadyAttached } from "../domain/licence-article.errors";
import type { LicenceArticleRepository } from "../ports/licence-article.repository";

export interface AddArticleToLicenceInput {
  readonly licenceId: string;
  readonly articleId: number;
  /** null = volume non défini (équivalent illimité métier). */
  readonly volumeAutorise: number | null;
  readonly volumeConsomme?: number | null;
}

export class AddArticleToLicenceUseCase {
  constructor(
    private readonly licenceArticleRepository: LicenceArticleRepository,
    private readonly licenceRepository: LicenceRepository,
    private readonly articleRepository: ArticleRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: AddArticleToLicenceInput, actorId: string): Promise<LicenceArticleDTO> {
    const persisted = await db.transaction(async (tx) => {
      const licence = await this.licenceRepository.findById(input.licenceId, tx);
      if (licence === null) throw licenceNotFoundById(input.licenceId);

      const article = await this.articleRepository.findById(input.articleId, tx);
      if (article === null) throw articleNotFoundById(input.articleId);

      const existing = await this.licenceArticleRepository.findByLicenceArticle(
        input.licenceId,
        input.articleId,
        tx,
      );
      if (existing !== null) throw licenceArticleAlreadyAttached(input.licenceId, input.articleId);

      const candidate = LicenceArticle.create({
        licenceId: input.licenceId,
        articleId: input.articleId,
        volumeAutorise: input.volumeAutorise,
        volumeConsomme: input.volumeConsomme,
      });
      const saved = await this.licenceArticleRepository.save(candidate, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "licence-article",
        entityId: saved.id,
        action: "LICENCE_ARTICLE_ADDED",
        afterData: saved.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return saved;
    });

    return toDTO(persisted);
  }
}
