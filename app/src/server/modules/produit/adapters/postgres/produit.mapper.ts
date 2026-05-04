// ==============================================================================
// LIC v2 — Mapper Produit (Phase 6 étape 6.B)
// ==============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { Produit, type PersistedProduit } from "../../domain/produit.entity";

import type { produitsRef } from "./schema";

type ProduitRow = InferSelectModel<typeof produitsRef>;
type ProduitInsert = InferInsertModel<typeof produitsRef>;

export interface ProduitDTO {
  readonly id: number;
  readonly code: string;
  readonly nom: string;
  readonly description: string | null;
  readonly actif: boolean;
}

export function toEntity(row: ProduitRow): PersistedProduit {
  return Produit.rehydrate({
    id: row.id,
    code: row.code,
    nom: row.nom,
    description: row.description ?? undefined,
    actif: row.actif,
  });
}

export function toDTO(entity: PersistedProduit): ProduitDTO {
  return {
    id: entity.id,
    code: entity.code,
    nom: entity.nom,
    description: entity.description ?? null,
    actif: entity.actif,
  };
}

export function toPersistence(entity: Produit): ProduitInsert {
  return {
    code: entity.code,
    nom: entity.nom,
    description: entity.description ?? null,
    actif: entity.actif,
  };
}
