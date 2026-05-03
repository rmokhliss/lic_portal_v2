// ==============================================================================
// LIC v2 — Mapper Entite (Phase 4 étape 4.C)
// ==============================================================================

import type { PersistedEntite } from "../../domain/entite.entity";
import { Entite } from "../../domain/entite.entity";

import type { entites as entitesTable } from "./schema";

type EntiteRow = typeof entitesTable.$inferSelect;

export interface EntiteDTO {
  readonly id: string;
  readonly clientId: string;
  readonly nom: string;
  readonly codePays: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}

export function rowToEntity(row: EntiteRow): PersistedEntite {
  return Entite.rehydrate({
    id: row.id,
    clientId: row.clientId,
    nom: row.nom,
    codePays: row.codePays,
    actif: row.actif,
    dateCreation: row.createdAt,
  });
}

export function toDTO(entity: PersistedEntite): EntiteDTO {
  return {
    id: entity.id,
    clientId: entity.clientId,
    nom: entity.nom,
    codePays: entity.codePays,
    actif: entity.actif,
    dateCreation: entity.dateCreation.toISOString(),
  };
}
