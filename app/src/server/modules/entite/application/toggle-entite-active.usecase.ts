// ==============================================================================
// LIC v2 — ToggleEntiteActiveUseCase (Phase 4 étape 4.C)
// Soft delete via actif boolean. Audit ENTITE_ACTIVATED / ENTITE_DEACTIVATED.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type EntiteDTO } from "../adapters/postgres/entite.mapper";
import { entiteNotFoundById } from "../domain/entite.errors";
import type { EntiteRepository } from "../ports/entite.repository";

export interface ToggleEntiteActiveUseCaseInput {
  readonly entiteId: string;
}

export interface ToggleEntiteActiveUseCaseOutput {
  readonly entite: EntiteDTO;
}

export class ToggleEntiteActiveUseCase {
  constructor(
    private readonly entiteRepository: EntiteRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: ToggleEntiteActiveUseCaseInput,
    actorId: string,
  ): Promise<ToggleEntiteActiveUseCaseOutput> {
    const toggled = await db.transaction(async (tx) => {
      const existing = await this.entiteRepository.findById(input.entiteId, tx);
      if (existing === null) {
        throw entiteNotFoundById(input.entiteId);
      }

      const newActif = !existing.actif;
      await this.entiteRepository.updateActif(existing.id, newActif, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "entite",
        entityId: existing.id,
        action: newActif ? "ENTITE_ACTIVATED" : "ENTITE_DEACTIVATED",
        beforeData: { actif: existing.actif },
        afterData: { actif: newActif },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        // clientId omis (cf. R-33).
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return existing.toggle();
    });

    return { entite: toDTO(toggled) };
  }
}
