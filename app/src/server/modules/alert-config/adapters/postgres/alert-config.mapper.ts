// ==============================================================================
// LIC v2 — Mapper AlertConfig (Phase 8.B)
// ==============================================================================

import type { InferSelectModel } from "drizzle-orm";

import { AlertConfig, type PersistedAlertConfig } from "../../domain/alert-config.entity";

import type { alertConfigs } from "./schema";

type Row = InferSelectModel<typeof alertConfigs>;

export interface AlertConfigDTO {
  readonly id: string;
  readonly clientId: string;
  readonly libelle: string;
  readonly canaux: readonly ("IN_APP" | "EMAIL" | "SMS")[];
  readonly seuilVolumePct: number | null;
  readonly seuilDateJours: number | null;
  readonly actif: boolean;
}

export function toEntity(row: Row): PersistedAlertConfig {
  return AlertConfig.rehydrate({
    id: row.id,
    clientId: row.clientId,
    libelle: row.libelle,
    canaux: row.canaux,
    seuilVolumePct: row.seuilVolumePct,
    seuilDateJours: row.seuilDateJours,
    actif: row.actif,
    creePar: row.creePar,
    modifiePar: row.modifiePar,
  });
}

export function toDTO(entity: PersistedAlertConfig): AlertConfigDTO {
  return {
    id: entity.id,
    clientId: entity.clientId,
    libelle: entity.libelle,
    canaux: [...entity.canaux],
    seuilVolumePct: entity.seuilVolumePct,
    seuilDateJours: entity.seuilDateJours,
    actif: entity.actif,
  };
}
