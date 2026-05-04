// ==============================================================================
// LIC v2 — Mapper FichierLog (Phase 10.B)
// ==============================================================================

import type { InferSelectModel } from "drizzle-orm";

import { FichierLog, type PersistedFichierLog } from "../../domain/fichier-log.entity";

import type { fichiersLog } from "./schema";

type Row = InferSelectModel<typeof fichiersLog>;

export interface FichierLogDTO {
  readonly id: string;
  readonly licenceId: string;
  readonly type: "LIC_GENERATED" | "HEALTHCHECK_IMPORTED";
  readonly statut: "GENERATED" | "IMPORTED" | "ERREUR";
  readonly path: string;
  readonly hash: string;
  readonly metadata: Record<string, unknown> | null;
  readonly errorMessage: string | null;
  readonly creePar: string | null;
  readonly createdAt: string;
}

export function toEntity(row: Row): PersistedFichierLog {
  return FichierLog.rehydrate({
    id: row.id,
    licenceId: row.licenceId,
    type: row.type,
    statut: row.statut,
    path: row.path,
    hash: row.hash,
    metadata: row.metadata,
    errorMessage: row.errorMessage,
    creePar: row.creePar,
    createdAt: row.createdAt,
  });
}

export function toDTO(entity: PersistedFichierLog): FichierLogDTO {
  return {
    id: entity.id,
    licenceId: entity.licenceId,
    type: entity.type,
    statut: entity.statut,
    path: entity.path,
    hash: entity.hash,
    metadata: entity.metadata,
    errorMessage: entity.errorMessage,
    creePar: entity.creePar,
    createdAt: entity.createdAt.toISOString(),
  };
}
