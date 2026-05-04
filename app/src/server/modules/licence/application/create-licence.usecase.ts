// ==============================================================================
// LIC v2 — CreateLicenceUseCase (Phase 5)
//
// 1. db.transaction:
//    a. Validation domaine + dates cohérentes (cf. CHECK BD)
//    b. allocateNextReference(tx) → "LIC-{YYYY}-{NNN}"
//    c. save(licence) → throw SPX-LIC-736 si conflit unique (race)
//    d. audit LICENCE_CREATED (entité métier — règle L3)
//
// TODO Phase 3 — ADR 0002 (DETTE-LIC-008) :
//    Ajouter ICI une fois Phase 3 livrée :
//      e. const { publicKeyPem, privateKeyPem } = generateClientKeyPair();
//      f. const cert = signCertificateByCA(publicKeyPem, licence.reference);
//      g. licenceCertificateRepository.save({ licenceId, cert, privateKeyEnc }, tx);
//    Sans ces 3 étapes, la génération du fichier .lic signé Phase 10 est
//    impossible. Cf. PROJECT_CONTEXT_LIC.md §10 DETTE-LIC-008.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { isAppError } from "@/server/modules/error";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type LicenceDTO } from "../adapters/postgres/licence.mapper";
import { Licence } from "../domain/licence.entity";
import { licenceReferenceAlreadyExists } from "../domain/licence.errors";
import type { LicenceRepository } from "../ports/licence.repository";

export interface CreateLicenceUseCaseInput {
  readonly clientId: string;
  readonly entiteId: string;
  readonly dateDebut: Date;
  readonly dateFin: Date;
  readonly commentaire?: string;
  readonly renouvellementAuto?: boolean;
}

export interface CreateLicenceUseCaseOutput {
  readonly licence: LicenceDTO;
}

export class CreateLicenceUseCase {
  constructor(
    private readonly licenceRepository: LicenceRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: CreateLicenceUseCaseInput,
    actorId: string,
  ): Promise<CreateLicenceUseCaseOutput> {
    const persisted = await db.transaction(async (tx) => {
      const reference = await this.licenceRepository.allocateNextReference(tx);
      const candidate = Licence.create({
        reference,
        clientId: input.clientId,
        entiteId: input.entiteId,
        dateDebut: input.dateDebut,
        dateFin: input.dateFin,
        commentaire: input.commentaire,
        renouvellementAuto: input.renouvellementAuto,
      });

      let saved;
      try {
        saved = await this.licenceRepository.save(candidate, actorId, tx);
      } catch (err) {
        // Race possible sur allocateNextReference + save (pas atomic) → la
        // contrainte UNIQUE attrapera ; on remappe en erreur métier typée.
        if (isAppError(err)) throw err;
        if (err instanceof Error && /unique/i.test(err.message)) {
          throw licenceReferenceAlreadyExists(reference);
        }
        throw err;
      }

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "licence",
        entityId: saved.id,
        action: "LICENCE_CREATED",
        afterData: saved.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        // clientId omis — clientDisplay non disponible sans round-trip (cf. R-33).
        // Tracé indirectement via afterData.clientId.
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return saved;
    });

    return { licence: toDTO(persisted) };
  }
}
