// ==============================================================================
// LIC v2 — Mapper Region (Phase 2.B étape 2/7)
//
// 3 directions de conversion :
//   - toEntity(row)        : row Drizzle → PersistedRegion (rehydrate)
//   - toDTO(entity)        : PersistedRegion → RegionDTO (JSON-serializable)
//   - toPersistence(entity): Region → row Drizzle pour INSERT (sans id, BD-gen)
//
// `dmResponsable` côté BD est nullable. L'entité Domain représente l'absence
// par `undefined` (pas `null`). Le mapper traduit aux frontières.
//
// `dateCreation` ISO 8601 dans le DTO pour serialization cross-tier
// (Server Action → JSON → fetch → UI). Conversion fuseau locale en frontend
// uniquement (règle L8).
// ==============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { Region, type PersistedRegion } from "../../domain/region.entity";

import type { regionsRef } from "./schema";

type RegionRow = InferSelectModel<typeof regionsRef>;
type RegionInsert = InferInsertModel<typeof regionsRef>;

export interface RegionDTO {
  readonly id: number;
  readonly regionCode: string;
  readonly nom: string;
  readonly dmResponsable: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}

export function toEntity(row: RegionRow): PersistedRegion {
  return Region.rehydrate({
    id: row.id,
    regionCode: row.regionCode,
    nom: row.nom,
    dmResponsable: row.dmResponsable ?? undefined,
    actif: row.actif,
    dateCreation: row.dateCreation,
  });
}

export function toDTO(entity: PersistedRegion): RegionDTO {
  return {
    id: entity.id,
    regionCode: entity.regionCode,
    nom: entity.nom,
    dmResponsable: entity.dmResponsable ?? null,
    actif: entity.actif,
    dateCreation: entity.dateCreation.toISOString(),
  };
}

/** Région → row pour INSERT. Pas d'id (serial BD-gen) ni dateCreation
 *  (defaultNow BD-gen). dmResponsable=undefined → null (Drizzle convertit). */
export function toPersistence(entity: Region): RegionInsert {
  return {
    regionCode: entity.regionCode,
    nom: entity.nom,
    dmResponsable: entity.dmResponsable ?? null,
    actif: entity.actif,
  };
}
