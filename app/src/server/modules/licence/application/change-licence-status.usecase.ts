// ==============================================================================
// LIC v2 — ChangeLicenceStatusUseCase (Phase 5).
// EXPIRE terminal (canTransition). Audit codes spécifiques par transition.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type LicenceDTO } from "../adapters/postgres/licence.mapper";
import { Licence, type LicenceStatus } from "../domain/licence.entity";
import { licenceNotFoundById, licenceStatusTransitionForbidden } from "../domain/licence.errors";
import type { LicenceRepository } from "../ports/licence.repository";

export interface ChangeLicenceStatusUseCaseInput {
  readonly licenceId: string;
  readonly expectedVersion: number;
  readonly newStatus: LicenceStatus;
}

export interface ChangeLicenceStatusUseCaseOutput {
  readonly licence: LicenceDTO;
}

function pickAuditAction(from: LicenceStatus, to: LicenceStatus): string {
  if (to === "EXPIRE") return "LICENCE_EXPIRED";
  if (to === "SUSPENDU") return "LICENCE_SUSPENDED";
  if (from === "SUSPENDU" && to === "ACTIF") return "LICENCE_REACTIVATED";
  if (to === "ACTIF") return "LICENCE_ACTIVATED";
  // Reste = INACTIF (TS narrow exhaustif après les 4 if ci-dessus).
  return "LICENCE_DEACTIVATED";
}

export class ChangeLicenceStatusUseCase {
  constructor(
    private readonly licenceRepository: LicenceRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: ChangeLicenceStatusUseCaseInput,
    actorId: string,
  ): Promise<ChangeLicenceStatusUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.licenceRepository.findById(input.licenceId, tx);
      if (existing === null) throw licenceNotFoundById(input.licenceId);
      if (!Licence.canTransition(existing.status, input.newStatus)) {
        throw licenceStatusTransitionForbidden(existing.status, input.newStatus);
      }

      const patched = existing.withStatus(input.newStatus);
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
        action: pickAuditAction(existing.status, input.newStatus),
        beforeData: { status: existing.status },
        afterData: { status: input.newStatus },
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
