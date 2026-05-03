// ==============================================================================
// LIC v2 — CreateEntiteUseCase (Phase 4 étape 4.C)
//
// 1. Entite.create(input) → throw SPX-LIC-732 si validation
// 2. db.transaction:
//    a. findByClientAndNom(clientId, nom) → throw SPX-LIC-731 si conflit UNIQUE
//    b. save(entite)
//    c. audit ENTITE_CREATED (audit obligatoire — entité métier)
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type EntiteDTO } from "../adapters/postgres/entite.mapper";
import { type CreateEntiteDomainInput, Entite } from "../domain/entite.entity";
import { entiteNomAlreadyExists } from "../domain/entite.errors";
import type { EntiteRepository } from "../ports/entite.repository";

export type CreateEntiteUseCaseInput = CreateEntiteDomainInput;

export interface CreateEntiteUseCaseOutput {
  readonly entite: EntiteDTO;
}

export class CreateEntiteUseCase {
  constructor(
    private readonly entiteRepository: EntiteRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: CreateEntiteUseCaseInput,
    actorId: string,
  ): Promise<CreateEntiteUseCaseOutput> {
    const candidate = Entite.create(input);

    const persisted = await db.transaction(async (tx) => {
      const existing = await this.entiteRepository.findByClientAndNom(
        candidate.clientId,
        candidate.nom,
        tx,
      );
      if (existing !== null) {
        throw entiteNomAlreadyExists(candidate.clientId, candidate.nom);
      }

      const saved = await this.entiteRepository.save(candidate, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "entite",
        entityId: saved.id,
        action: "ENTITE_CREATED",
        afterData: saved.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        // clientId omis (clientDisplay non disponible sans round-trip — cf. R-33).
        // Le clientId est tracé via afterData.clientId (toAuditSnapshot).
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return saved;
    });

    return { entite: toDTO(persisted) };
  }
}
