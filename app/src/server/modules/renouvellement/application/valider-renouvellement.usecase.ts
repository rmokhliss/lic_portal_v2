// ==============================================================================
// LIC v2 — ValiderRenouvellementUseCase (Phase 5 + Phase 24)
//
// EN_COURS → VALIDE. Pose valide_par = actor + date_validation = NOW().
//
// Phase 24 — la validation MET À JOUR la licence parente :
//   - licence.dateDebut = renouvellement.nouvelleDateDebut
//   - licence.dateFin   = renouvellement.nouvelleDateFin
//   - si licence.status === "EXPIRE" → re-bascule en "ACTIF" (renouvellement
//     d'une licence déjà expirée). Sinon le statut reste inchangé.
//   - bump version (optimistic locking L4).
//   - audit LICENCE_RENEWED (verbe distinct des transitions de statut manuelles).
//
// Tout dans la même transaction (règle L3) : 1 tx → 1 licence à jour + 1
// renouvellement VALIDE + 2 audits.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import { licenceNotFoundById } from "@/server/modules/licence/domain/licence.errors";
import type { LicenceRepository } from "@/server/modules/licence/ports/licence.repository";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type RenouvellementDTO } from "../adapters/postgres/renouvellement.mapper";
import { Renouvellement } from "../domain/renouvellement.entity";
import {
  renouvellementNotFoundById,
  renouvellementStatusTransitionForbidden,
} from "../domain/renouvellement.errors";
import type { RenouvellementRepository } from "../ports/renouvellement.repository";

export interface ValiderRenouvellementUseCaseInput {
  readonly renouvellementId: string;
}

export interface ValiderRenouvellementUseCaseOutput {
  readonly renouvellement: RenouvellementDTO;
}

export class ValiderRenouvellementUseCase {
  constructor(
    private readonly renouvellementRepository: RenouvellementRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
    /** Phase 24 — injecté pour propager les nouvelles dates sur la licence
     *  parente (avec optimistic locking + audit LICENCE_RENEWED). */
    private readonly licenceRepository: LicenceRepository,
  ) {}

  async execute(
    input: ValiderRenouvellementUseCaseInput,
    actorId: string,
  ): Promise<ValiderRenouvellementUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.renouvellementRepository.findById(input.renouvellementId, tx);
      if (existing === null) throw renouvellementNotFoundById(input.renouvellementId);
      if (!Renouvellement.canTransition(existing.status, "VALIDE")) {
        throw renouvellementStatusTransitionForbidden(existing.status, "VALIDE");
      }

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      // Phase 24 — propagation des nouvelles dates sur la licence parente +
      // re-activation si EXPIRE.
      const licence = await this.licenceRepository.findById(existing.licenceId, tx);
      if (licence === null) throw licenceNotFoundById(existing.licenceId);

      const beforeLicence = {
        status: licence.status,
        dateDebut: licence.dateDebut.toISOString(),
        dateFin: licence.dateFin.toISOString(),
      };
      let patchedLicence = licence.withProfile({
        dateDebut: existing.nouvelleDateDebut,
        dateFin: existing.nouvelleDateFin,
      });
      if (licence.status === "EXPIRE") {
        // EXPIRE est terminal côté canTransition mais re-activation par
        // renouvellement validé est business-legitimate. On bypass canTransition
        // ici (use-case spécifique) en passant par withStatus directement.
        patchedLicence = patchedLicence.withStatus("ACTIF");
      }
      await this.licenceRepository.update(patchedLicence, licence.version, actor.id, tx);

      const licenceAuditEntry = AuditEntry.create({
        entity: "licence",
        entityId: licence.id,
        action: "LICENCE_RENEWED",
        beforeData: beforeLicence,
        afterData: {
          status: patchedLicence.status,
          dateDebut: patchedLicence.dateDebut.toISOString(),
          dateFin: patchedLicence.dateFin.toISOString(),
          renouvellementId: existing.id,
        },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(licenceAuditEntry, tx);

      // Validation du renouvellement après la maj licence (logique : si la
      // mise à jour licence échoue par optimistic lock, le renouvellement
      // reste EN_COURS et l'utilisateur peut retry).
      const patched = existing.withStatus("VALIDE", actorId);
      await this.renouvellementRepository.update(patched, tx);

      const renouvAuditEntry = AuditEntry.create({
        entity: "renouvellement",
        entityId: existing.id,
        action: "RENOUVELLEMENT_VALIDATED",
        beforeData: { status: existing.status },
        afterData: { status: "VALIDE", valideePar: actorId },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(renouvAuditEntry, tx);

      return patched;
    });

    return { renouvellement: toDTO(updated) };
  }
}
