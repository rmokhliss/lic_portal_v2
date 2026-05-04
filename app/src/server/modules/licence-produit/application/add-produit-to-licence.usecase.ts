// ==============================================================================
// LIC v2 — AddProduitToLicenceUseCase (Phase 6 étape 6.C)
//
// Audit LICENCE_PRODUIT_ADDED dans même tx (L3). Vérifie :
//   - existence licence (SPX-LIC-735 si absente)
//   - existence produit (SPX-LIC-743 si absent)
//   - non-doublon (SPX-LIC-750 si déjà attaché)
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import { licenceNotFoundById } from "@/server/modules/licence/domain/licence.errors";
import type { LicenceRepository } from "@/server/modules/licence/ports/licence.repository";
import { produitNotFoundById } from "@/server/modules/produit/domain/produit.errors";
import type { ProduitRepository } from "@/server/modules/produit/ports/produit.repository";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type LicenceProduitDTO } from "../adapters/postgres/licence-produit.mapper";
import { LicenceProduit } from "../domain/licence-produit.entity";
import { licenceProduitAlreadyAttached } from "../domain/licence-produit.errors";
import type { LicenceProduitRepository } from "../ports/licence-produit.repository";

export interface AddProduitToLicenceInput {
  readonly licenceId: string;
  readonly produitId: number;
}

export class AddProduitToLicenceUseCase {
  constructor(
    private readonly licenceProduitRepository: LicenceProduitRepository,
    private readonly licenceRepository: LicenceRepository,
    private readonly produitRepository: ProduitRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: AddProduitToLicenceInput, actorId: string): Promise<LicenceProduitDTO> {
    const persisted = await db.transaction(async (tx) => {
      const licence = await this.licenceRepository.findById(input.licenceId, tx);
      if (licence === null) throw licenceNotFoundById(input.licenceId);

      const produit = await this.produitRepository.findById(input.produitId, tx);
      if (produit === null) throw produitNotFoundById(input.produitId);

      const existing = await this.licenceProduitRepository.findByLicenceProduit(
        input.licenceId,
        input.produitId,
        tx,
      );
      if (existing !== null) throw licenceProduitAlreadyAttached(input.licenceId, input.produitId);

      const candidate = LicenceProduit.create({
        licenceId: input.licenceId,
        produitId: input.produitId,
      });
      const saved = await this.licenceProduitRepository.save(candidate, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "licence-produit",
        entityId: saved.id,
        action: "LICENCE_PRODUIT_ADDED",
        afterData: saved.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return saved;
    });

    return toDTO(persisted);
  }
}
