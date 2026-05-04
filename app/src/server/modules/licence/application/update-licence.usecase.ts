// ==============================================================================
// LIC v2 — UpdateLicenceUseCase (Phase 5). Optimistic lock L4.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type LicenceDTO } from "../adapters/postgres/licence.mapper";
import { licenceNotFoundById } from "../domain/licence.errors";
import type { LicenceRepository } from "../ports/licence.repository";

export interface UpdateLicenceUseCaseInput {
  readonly licenceId: string;
  readonly expectedVersion: number;
  readonly dateDebut?: Date;
  readonly dateFin?: Date;
  readonly commentaire?: string | null;
  readonly renouvellementAuto?: boolean;
}

export interface UpdateLicenceUseCaseOutput {
  readonly licence: LicenceDTO;
}

export class UpdateLicenceUseCase {
  constructor(
    private readonly licenceRepository: LicenceRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: UpdateLicenceUseCaseInput,
    actorId: string,
  ): Promise<UpdateLicenceUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.licenceRepository.findById(input.licenceId, tx);
      if (existing === null) throw licenceNotFoundById(input.licenceId);

      const patched = existing.withProfile({
        dateDebut: input.dateDebut,
        dateFin: input.dateFin,
        commentaire: input.commentaire,
        renouvellementAuto: input.renouvellementAuto,
      });

      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      if (
        input.dateDebut !== undefined &&
        existing.dateDebut.getTime() !== patched.dateDebut.getTime()
      ) {
        before.dateDebut = existing.dateDebut.toISOString();
        after.dateDebut = patched.dateDebut.toISOString();
      }
      if (input.dateFin !== undefined && existing.dateFin.getTime() !== patched.dateFin.getTime()) {
        before.dateFin = existing.dateFin.toISOString();
        after.dateFin = patched.dateFin.toISOString();
      }
      if (input.commentaire !== undefined && existing.commentaire !== patched.commentaire) {
        before.commentaire = existing.commentaire;
        after.commentaire = patched.commentaire;
      }
      if (
        input.renouvellementAuto !== undefined &&
        existing.renouvellementAuto !== patched.renouvellementAuto
      ) {
        before.renouvellementAuto = existing.renouvellementAuto;
        after.renouvellementAuto = patched.renouvellementAuto;
      }
      if (Object.keys(after).length === 0) return existing;

      const persisted = await this.licenceRepository.update(
        patched,
        input.expectedVersion,
        actorId,
        tx,
      );

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "licence",
        entityId: persisted.id,
        action: "LICENCE_UPDATED",
        beforeData: before,
        afterData: after,
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return persisted;
    });

    return { licence: toDTO(updated) };
  }
}
