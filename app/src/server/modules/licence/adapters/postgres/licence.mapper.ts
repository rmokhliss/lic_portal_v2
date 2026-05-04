// ==============================================================================
// LIC v2 — Mapper Licence (Phase 5)
// ==============================================================================

import type { PersistedLicence } from "../../domain/licence.entity";
import { Licence, type LicenceStatus } from "../../domain/licence.entity";

import type { licences as licencesTable } from "./schema";

type LicenceRow = typeof licencesTable.$inferSelect;

export interface LicenceDTO {
  readonly id: string;
  readonly reference: string;
  readonly clientId: string;
  readonly entiteId: string;
  readonly dateDebut: string;
  readonly dateFin: string;
  readonly status: LicenceStatus;
  readonly commentaire: string | null;
  readonly version: number;
  readonly renouvellementAuto: boolean;
  readonly notifEnvoyee: boolean;
  readonly dateCreation: string;
}

export function rowToEntity(row: LicenceRow): PersistedLicence {
  return Licence.rehydrate({
    id: row.id,
    reference: row.reference,
    clientId: row.clientId,
    entiteId: row.entiteId,
    dateDebut: row.dateDebut,
    dateFin: row.dateFin,
    status: row.status,
    commentaire: row.commentaire,
    version: row.version,
    renouvellementAuto: row.renouvellementAuto,
    notifEnvoyee: row.notifEnvoyee,
    dateCreation: row.createdAt,
  });
}

export function toDTO(entity: PersistedLicence): LicenceDTO {
  return {
    id: entity.id,
    reference: entity.reference,
    clientId: entity.clientId,
    entiteId: entity.entiteId,
    dateDebut: entity.dateDebut.toISOString(),
    dateFin: entity.dateFin.toISOString(),
    status: entity.status,
    commentaire: entity.commentaire,
    version: entity.version,
    renouvellementAuto: entity.renouvellementAuto,
    notifEnvoyee: entity.notifEnvoyee,
    dateCreation: entity.dateCreation.toISOString(),
  };
}
