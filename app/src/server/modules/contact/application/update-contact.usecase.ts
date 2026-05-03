// ==============================================================================
// LIC v2 — UpdateContactUseCase (Phase 4 étape 4.C)
// Audit CONTACT_UPDATED avec diff before/after restreint aux champs modifiés.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type ContactDTO } from "../adapters/postgres/contact.mapper";
import { contactNotFoundById } from "../domain/contact.errors";
import type { ContactRepository } from "../ports/contact.repository";

export interface UpdateContactUseCaseInput {
  readonly contactId: string;
  readonly typeContactCode?: string;
  readonly nom?: string;
  readonly prenom?: string | null;
  readonly email?: string | null;
  readonly telephone?: string | null;
}

export interface UpdateContactUseCaseOutput {
  readonly contact: ContactDTO;
}

export class UpdateContactUseCase {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: UpdateContactUseCaseInput,
    actorId: string,
  ): Promise<UpdateContactUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.contactRepository.findById(input.contactId, tx);
      if (existing === null) {
        throw contactNotFoundById(input.contactId);
      }

      const patched = existing.withProfile({
        typeContactCode: input.typeContactCode,
        nom: input.nom,
        prenom: input.prenom,
        email: input.email,
        telephone: input.telephone,
      });

      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      const fields: readonly (keyof typeof patched)[] = [
        "typeContactCode",
        "nom",
        "prenom",
        "email",
        "telephone",
      ];
      for (const f of fields) {
        if (existing[f] !== patched[f]) {
          before[f] = existing[f];
          after[f] = patched[f];
        }
      }

      if (Object.keys(after).length === 0) return existing;

      await this.contactRepository.update(patched, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "contact",
        entityId: existing.id,
        action: "CONTACT_UPDATED",
        beforeData: before,
        afterData: after,
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return patched;
    });

    return { contact: toDTO(updated) };
  }
}
