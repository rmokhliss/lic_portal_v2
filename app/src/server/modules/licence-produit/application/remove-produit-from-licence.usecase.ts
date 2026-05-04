// ==============================================================================
// LIC v2 — RemoveProduitFromLicenceUseCase (Phase 6 étape 6.C)
// Audit LICENCE_PRODUIT_REMOVED dans même tx (L3).
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { licenceProduitNotFoundById } from "../domain/licence-produit.errors";
import type { LicenceProduitRepository } from "../ports/licence-produit.repository";

export interface RemoveProduitFromLicenceInput {
  readonly id: string;
}

export class RemoveProduitFromLicenceUseCase {
  constructor(
    private readonly licenceProduitRepository: LicenceProduitRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: RemoveProduitFromLicenceInput, actorId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const existing = await this.licenceProduitRepository.findById(input.id, tx);
      if (existing === null) throw licenceProduitNotFoundById(input.id);

      await this.licenceProduitRepository.delete(input.id, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "licence-produit",
        entityId: existing.id,
        action: "LICENCE_PRODUIT_REMOVED",
        beforeData: existing.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);
    });
  }
}
