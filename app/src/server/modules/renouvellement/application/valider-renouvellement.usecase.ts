// ==============================================================================
// LIC v2 — ValiderRenouvellementUseCase (Phase 5)
//
// EN_COURS → VALIDE. Pose valide_par = actor + date_validation = NOW().
// Audit RENOUVELLEMENT_VALIDATED dans la même tx (L3).
// Pas d'effet sur la licence parente — la création de la nouvelle licence
// (renouvellement type "CREE") est gérée par un job Phase 9 (auto-renouvellement).
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

export interface ValiderRenouvellementUseCaseInput {
  readonly renouvellementId: string;
}

export interface ValiderRenouvellementUseCaseOutput {
  readonly renouvellement: RenouvellementDTO;
}

export class ValiderRenouvellementUseCase {
  constructor(
    private readonly renouvellementRepository: RenouvellementRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: ValiderRenouvellementUseCaseInput,
    actorId: string,
  ): Promise<ValiderRenouvellementUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.renouvellementRepository.findById(input.renouvellementId, tx);
      if (existing === null) throw renouvellementNotFoundById(input.renouvellementId);
      if (!Renouvellement.canTransition(existing.status, "VALIDE")) {
        throw renouvellementStatusTransitionForbidden(existing.status, "VALIDE");
      }

      const patched = existing.withStatus("VALIDE", actorId);
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
        action: "RENOUVELLEMENT_VALIDATED",
        beforeData: { status: existing.status },
        afterData: { status: "VALIDE", valideePar: actorId },
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
