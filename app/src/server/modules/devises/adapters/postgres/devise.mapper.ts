// ==============================================================================
// LIC v2 — Mapper Devise (Phase 2.B étape 3/7)
//
// Pas de dateCreation côté BD/DTO (cf. data-model.md — la table n'a pas cette colonne).
// ==============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { Devise, type PersistedDevise } from "../../domain/devise.entity";

import type { devisesRef } from "./schema";

type DeviseRow = InferSelectModel<typeof devisesRef>;
type DeviseInsert = InferInsertModel<typeof devisesRef>;

export interface DeviseDTO {
  readonly id: number;
  readonly codeDevise: string;
  readonly nom: string;
  readonly symbole: string | null;
  readonly actif: boolean;
}

export function toEntity(row: DeviseRow): PersistedDevise {
  return Devise.rehydrate({
    id: row.id,
    codeDevise: row.codeDevise,
    nom: row.nom,
    symbole: row.symbole ?? undefined,
    actif: row.actif,
  });
}

export function toDTO(entity: PersistedDevise): DeviseDTO {
  return {
    id: entity.id,
    codeDevise: entity.codeDevise,
    nom: entity.nom,
    symbole: entity.symbole ?? null,
    actif: entity.actif,
  };
}

export function toPersistence(entity: Devise): DeviseInsert {
  return {
    codeDevise: entity.codeDevise,
    nom: entity.nom,
    symbole: entity.symbole ?? null,
    actif: entity.actif,
  };
}
