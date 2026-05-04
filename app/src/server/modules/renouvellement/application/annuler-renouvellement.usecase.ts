// ==============================================================================
// LIC v2 — AnnulerRenouvellementUseCase (Phase 5)
// EN_COURS → ANNULE. Le motif est ajouté au commentaire pour traçabilité.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type RenouvellementDTO } from "../adapters/postgres/renouvellement.mapper";
import { Renouvellement } from "../domain/renouvellement.entity";
import {
  renouvellementNotFoundById,
  renouvellementStatusTransitionForbidden,
} from "../domain/renouvellement.errors";
import type { RenouvellementRepository } from "../ports/renouvellement.repository";

export interface AnnulerRenouvellementUseCaseInput {
  readonly renouvellementId: string;
  readonly motif?: string;
}

export interface AnnulerRenouvellementUseCaseOutput {
  readonly renouvellement: RenouvellementDTO;
}

export class AnnulerRenouvellementUseCase {
  constructor(
    private readonly renouvellementRepository: RenouvellementRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: AnnulerRenouvellementUseCaseInput,
    actorId: string,
  ): Promise<AnnulerRenouvellementUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.renouvellementRepository.findById(input.renouvellementId, tx);
      if (existing === null) throw renouvellementNotFoundById(input.renouvellementId);
      if (!Renouvellement.canTransition(existing.status, "ANNULE")) {
        throw renouvellementStatusTransitionForbidden(existing.status, "ANNULE");
      }

      // Ajout du motif au commentaire existant (séparateur " | Annulé : ").
      const newCommentaire =
        input.motif !== undefined && input.motif.trim().length > 0
          ? existing.commentaire !== null && existing.commentaire.length > 0
            ? `${existing.commentaire} | Annulé : ${input.motif.trim()}`
            : `Annulé : ${input.motif.trim()}`
          : existing.commentaire;

      const patched = existing.withCommentaire(newCommentaire).withStatus("ANNULE", null);
      await this.renouvellementRepository.update(patched, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "renouvellement",
        entityId: existing.id,
        action: "RENOUVELLEMENT_CANCELLED",
        beforeData: { status: existing.status },
        afterData: { status: "ANNULE", motif: input.motif ?? null },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return patched;
    });

    return { renouvellement: toDTO(updated) };
  }
}
