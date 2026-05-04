// ==============================================================================
// LIC v2 — CreateRenouvellementUseCase (Phase 5)
// Audit RENOUVELLEMENT_CREATED dans même tx (L3).
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { LicenceRepository } from "@/server/modules/licence/ports/licence.repository";
import { licenceNotFoundById } from "@/server/modules/licence/domain/licence.errors";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type RenouvellementDTO } from "../adapters/postgres/renouvellement.mapper";
import { Renouvellement } from "../domain/renouvellement.entity";
import type { RenouvellementRepository } from "../ports/renouvellement.repository";

export interface CreateRenouvellementUseCaseInput {
  readonly licenceId: string;
  readonly nouvelleDateDebut: Date;
  readonly nouvelleDateFin: Date;
  readonly commentaire?: string;
}

export interface CreateRenouvellementUseCaseOutput {
  readonly renouvellement: RenouvellementDTO;
}

export class CreateRenouvellementUseCase {
  constructor(
    private readonly renouvellementRepository: RenouvellementRepository,
    private readonly licenceRepository: LicenceRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: CreateRenouvellementUseCaseInput,
    actorId: string,
  ): Promise<CreateRenouvellementUseCaseOutput> {
    const persisted = await db.transaction(async (tx) => {
      // Vérification existence licence parente (FK + erreur métier typée).
      const licence = await this.licenceRepository.findById(input.licenceId, tx);
      if (licence === null) throw licenceNotFoundById(input.licenceId);

      const candidate = Renouvellement.create({
        licenceId: input.licenceId,
        nouvelleDateDebut: input.nouvelleDateDebut,
        nouvelleDateFin: input.nouvelleDateFin,
        commentaire: input.commentaire,
      });
      const saved = await this.renouvellementRepository.save(candidate, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "renouvellement",
        entityId: saved.id,
        action: "RENOUVELLEMENT_CREATED",
        afterData: saved.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return saved;
    });

    return { renouvellement: toDTO(persisted) };
  }
}
