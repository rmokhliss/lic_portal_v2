// ==============================================================================
// LIC v2 — ToggleUserActiveUseCase (Phase 2.B.bis EC-08)
//
// Bascule actif/inactif. Règle métier critique :
//   - SADMIN ne peut pas se désactiver lui-même → SPX-LIC-723
//     (vérifié uniquement quand actor=target ET tentative true→false).
//
// Orchestration transactionnelle :
//   1. db.transaction:
//      a. findByIdEntity(userId) → throw SPX-LIC-720 si null
//      b. Si actorId === userId ET existing.actif === true → SPX-LIC-723
//      c. updateActif(id, !existing.actif)
//      d. Audit USER_ACTIVATED (false→true) ou USER_DEACTIVATED (true→false)
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";

import { toDTO, type UserDTO } from "../adapters/postgres/user.mapper";
import { selfDeactivationForbidden, userNotFoundById } from "../domain/user.errors";
import type { UserRepository } from "../ports/user.repository";

export interface ToggleUserActiveUseCaseInput {
  readonly userId: string;
}

export interface ToggleUserActiveUseCaseOutput {
  readonly user: UserDTO;
}

export class ToggleUserActiveUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: ToggleUserActiveUseCaseInput,
    actorId: string,
  ): Promise<ToggleUserActiveUseCaseOutput> {
    const toggled = await db.transaction(async (tx) => {
      const existing = await this.userRepository.findByIdEntity(input.userId, tx);
      if (existing === null) {
        throw userNotFoundById(input.userId);
      }

      // Règle data-model.md §lic_users : un admin ne peut pas se désactiver
      // lui-même (perte d'accès SADMIN potentielle si dernier compte). La
      // réactivation de soi est sans objet (un user inactif ne peut pas
      // appeler cette action — bloqué par requireRole en amont).
      if (input.userId === actorId && existing.actif) {
        throw selfDeactivationForbidden(actorId);
      }

      const newActif = !existing.actif;
      await this.userRepository.updateActif(existing.id, newActif, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "user",
        entityId: existing.id,
        action: newActif ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        beforeData: { actif: existing.actif },
        afterData: { actif: newActif },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return existing.withActif(newActif);
    });

    return { user: toDTO(toggled) };
  }
}
