// ==============================================================================
// LIC v2 — CreateContactUseCase (Phase 4 étape 4.C)
// Audit obligatoire CONTACT_CREATED dans la même tx.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type ContactDTO } from "../adapters/postgres/contact.mapper";
import { Contact, type CreateContactDomainInput } from "../domain/contact.entity";
import type { ContactRepository } from "../ports/contact.repository";

export type CreateContactUseCaseInput = CreateContactDomainInput;

export interface CreateContactUseCaseOutput {
  readonly contact: ContactDTO;
}

export class CreateContactUseCase {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: CreateContactUseCaseInput,
    actorId: string,
  ): Promise<CreateContactUseCaseOutput> {
    const candidate = Contact.create(input);

    const persisted = await db.transaction(async (tx) => {
      const saved = await this.contactRepository.save(candidate, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "contact",
        entityId: saved.id,
        action: "CONTACT_CREATED",
        afterData: saved.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return saved;
    });

    return { contact: toDTO(persisted) };
  }
}
