// ==============================================================================
// LIC v2 — UpdateRenouvellementUseCase (Phase 9.A)
//
// Édition d'un renouvellement EN_COURS : dates et/ou commentaire. Refuse si
// le renouvellement n'est plus EN_COURS (statut terminal — VALIDE/CREE/ANNULE).
//
// Audit RENOUVELLEMENT_UPDATED dans la même tx (règle L3) avec before/after.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { ConflictError, InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type RenouvellementDTO } from "../adapters/postgres/renouvellement.mapper";
import { renouvellementNotFoundById } from "../domain/renouvellement.errors";
import type { PersistedRenouvellement } from "../domain/renouvellement.entity";
import type { RenouvellementRepository } from "../ports/renouvellement.repository";

export interface UpdateRenouvellementInput {
  readonly renouvellementId: string;
  readonly nouvelleDateDebut?: Date;
  readonly nouvelleDateFin?: Date;
  readonly commentaire?: string | null;
}

export class UpdateRenouvellementUseCase {
  constructor(
    private readonly renouvellementRepository: RenouvellementRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: UpdateRenouvellementInput, actorId: string): Promise<RenouvellementDTO> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.renouvellementRepository.findById(input.renouvellementId, tx);
      if (existing === null) throw renouvellementNotFoundById(input.renouvellementId);

      // Édition autorisée uniquement si statut EN_COURS — réutilise SPX-LIC-742
      // (transition de statut interdite) puisque la règle métier est : on ne
      // peut pas modifier un renouvellement déjà clôturé.
      if (existing.status !== "EN_COURS") {
        throw new ConflictError({
          code: "SPX-LIC-742",
          message: `Renouvellement ${input.renouvellementId} non modifiable (statut ${existing.status})`,
          details: { renouvellementId: input.renouvellementId, status: existing.status },
        });
      }

      let patched: PersistedRenouvellement = existing;
      if (input.nouvelleDateDebut !== undefined && input.nouvelleDateFin !== undefined) {
        patched = patched.withDates(input.nouvelleDateDebut, input.nouvelleDateFin);
      } else if (input.nouvelleDateDebut !== undefined) {
        patched = patched.withDates(input.nouvelleDateDebut, patched.nouvelleDateFin);
      } else if (input.nouvelleDateFin !== undefined) {
        patched = patched.withDates(patched.nouvelleDateDebut, input.nouvelleDateFin);
      }
      if ("commentaire" in input) {
        patched = patched.withCommentaire(input.commentaire ?? null);
      }

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
        entityId: patched.id,
        action: "RENOUVELLEMENT_UPDATED",
        beforeData: existing.toAuditSnapshot(),
        afterData: patched.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return patched;
    });

    return toDTO(updated);
  }
}
