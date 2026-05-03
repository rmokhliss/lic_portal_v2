// ==============================================================================
// LIC v2 — Mapper TypeContact (Phase 2.B étape 3/7)
// ==============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { TypeContact, type PersistedTypeContact } from "../../domain/type-contact.entity";

import type { typesContactRef } from "./schema";

type TypeContactRow = InferSelectModel<typeof typesContactRef>;
type TypeContactInsert = InferInsertModel<typeof typesContactRef>;

export interface TypeContactDTO {
  readonly id: number;
  readonly code: string;
  readonly libelle: string;
  readonly actif: boolean;
}

export function toEntity(row: TypeContactRow): PersistedTypeContact {
  return TypeContact.rehydrate({
    id: row.id,
    code: row.code,
    libelle: row.libelle,
    actif: row.actif,
  });
}

export function toDTO(entity: PersistedTypeContact): TypeContactDTO {
  return {
    id: entity.id,
    code: entity.code,
    libelle: entity.libelle,
    actif: entity.actif,
  };
}

export function toPersistence(entity: TypeContact): TypeContactInsert {
  return {
    code: entity.code,
    libelle: entity.libelle,
    actif: entity.actif,
  };
}
