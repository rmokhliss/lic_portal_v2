// ==============================================================================
// LIC v2 — DeleteContactUseCase (Phase 4 étape 4.C)
//
// Hard delete. Audit CONTACT_DELETED dans la même tx avec snapshot complet
// dans `beforeData` (afterData=null) — la traçabilité métier vit dans
// lic_audit_log puisqu'aucune trace n'est laissée en BD.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { contactNotFoundById } from "../domain/contact.errors";
import type { ContactRepository } from "../ports/contact.repository";

export interface DeleteContactUseCaseInput {
  readonly contactId: string;
}

export class DeleteContactUseCase {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: DeleteContactUseCaseInput, actorId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const existing = await this.contactRepository.findById(input.contactId, tx);
      if (existing === null) {
        throw contactNotFoundById(input.contactId);
      }

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      // Audit AVANT delete : capture snapshot complet pour la trace.
      const entry = AuditEntry.create({
        entity: "contact",
        entityId: existing.id,
        action: "CONTACT_DELETED",
        beforeData: existing.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      await this.contactRepository.delete(existing.id, tx);
    });
  }
}
