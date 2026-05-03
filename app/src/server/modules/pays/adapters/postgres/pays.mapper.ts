// ==============================================================================
// LIC v2 — Mapper Pays (Phase 2.B étape 3/7)
// ==============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { Pays, type PersistedPays } from "../../domain/pays.entity";

import type { paysRef } from "./schema";

type PaysRow = InferSelectModel<typeof paysRef>;
type PaysInsert = InferInsertModel<typeof paysRef>;

export interface PaysDTO {
  readonly id: number;
  readonly codePays: string;
  readonly nom: string;
  readonly regionCode: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}

export function toEntity(row: PaysRow): PersistedPays {
  return Pays.rehydrate({
    id: row.id,
    codePays: row.codePays,
    nom: row.nom,
    regionCode: row.regionCode ?? undefined,
    actif: row.actif,
    dateCreation: row.dateCreation,
  });
}

export function toDTO(entity: PersistedPays): PaysDTO {
  return {
    id: entity.id,
    codePays: entity.codePays,
    nom: entity.nom,
    regionCode: entity.regionCode ?? null,
    actif: entity.actif,
    dateCreation: entity.dateCreation.toISOString(),
  };
}

export function toPersistence(entity: Pays): PaysInsert {
  return {
    codePays: entity.codePays,
    nom: entity.nom,
    regionCode: entity.regionCode ?? null,
    actif: entity.actif,
  };
}
