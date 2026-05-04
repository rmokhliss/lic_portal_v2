// ==============================================================================
// LIC v2 — Mapper Renouvellement (Phase 5)
// ==============================================================================

import type { PersistedRenouvellement } from "../../domain/renouvellement.entity";
import { Renouvellement, type RenewStatus } from "../../domain/renouvellement.entity";

import type { renouvellements as renouvellementsTable } from "./schema";

type RenouvRow = typeof renouvellementsTable.$inferSelect;

export interface RenouvellementDTO {
  readonly id: string;
  readonly licenceId: string;
  readonly nouvelleDateDebut: string;
  readonly nouvelleDateFin: string;
  readonly status: RenewStatus;
  readonly commentaire: string | null;
  readonly valideePar: string | null;
  readonly dateValidation: string | null;
  readonly dateCreation: string;
}

export function rowToEntity(row: RenouvRow): PersistedRenouvellement {
  return Renouvellement.rehydrate({
    id: row.id,
    licenceId: row.licenceId,
    nouvelleDateDebut: row.nouvelleDateDebut,
    nouvelleDateFin: row.nouvelleDateFin,
    status: row.status,
    commentaire: row.commentaire,
    valideePar: row.valideePar,
    dateValidation: row.dateValidation,
    dateCreation: row.createdAt,
  });
}

export function toDTO(entity: PersistedRenouvellement): RenouvellementDTO {
  return {
    id: entity.id,
    licenceId: entity.licenceId,
    nouvelleDateDebut: entity.nouvelleDateDebut.toISOString(),
    nouvelleDateFin: entity.nouvelleDateFin.toISOString(),
    status: entity.status,
    commentaire: entity.commentaire,
    valideePar: entity.valideePar,
    dateValidation: entity.dateValidation?.toISOString() ?? null,
    dateCreation: entity.dateCreation.toISOString(),
  };
}
