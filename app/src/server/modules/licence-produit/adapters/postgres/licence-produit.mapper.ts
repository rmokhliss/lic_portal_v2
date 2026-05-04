// ==============================================================================
// LIC v2 — Mapper LicenceProduit (Phase 6 étape 6.C)
// ==============================================================================

import type { InferSelectModel } from "drizzle-orm";

import { LicenceProduit, type PersistedLicenceProduit } from "../../domain/licence-produit.entity";

import type { licenceProduits } from "./schema";

type LicenceProduitRow = InferSelectModel<typeof licenceProduits>;

export interface LicenceProduitDTO {
  readonly id: string;
  readonly licenceId: string;
  readonly produitId: number;
  readonly dateAjout: string;
  readonly creePar: string | null;
}

export function toEntity(row: LicenceProduitRow): PersistedLicenceProduit {
  return LicenceProduit.rehydrate({
    id: row.id,
    licenceId: row.licenceId,
    produitId: row.produitId,
    dateAjout: row.dateAjout,
    creePar: row.creePar,
  });
}

export function toDTO(entity: PersistedLicenceProduit): LicenceProduitDTO {
  return {
    id: entity.id,
    licenceId: entity.licenceId,
    produitId: entity.produitId,
    dateAjout: entity.dateAjout.toISOString(),
    creePar: entity.creePar,
  };
}
