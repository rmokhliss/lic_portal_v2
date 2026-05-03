// ==============================================================================
// LIC v2 — Mapper Langue (Phase 2.B étape 3/7)
// ==============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { Langue, type PersistedLangue } from "../../domain/langue.entity";

import type { languesRef } from "./schema";

type LangueRow = InferSelectModel<typeof languesRef>;
type LangueInsert = InferInsertModel<typeof languesRef>;

export interface LangueDTO {
  readonly id: number;
  readonly codeLangue: string;
  readonly nom: string;
  readonly actif: boolean;
}

export function toEntity(row: LangueRow): PersistedLangue {
  return Langue.rehydrate({
    id: row.id,
    codeLangue: row.codeLangue,
    nom: row.nom,
    actif: row.actif,
  });
}

export function toDTO(entity: PersistedLangue): LangueDTO {
  return {
    id: entity.id,
    codeLangue: entity.codeLangue,
    nom: entity.nom,
    actif: entity.actif,
  };
}

export function toPersistence(entity: Langue): LangueInsert {
  return {
    codeLangue: entity.codeLangue,
    nom: entity.nom,
    actif: entity.actif,
  };
}
