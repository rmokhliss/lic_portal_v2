// ==============================================================================
// LIC v2 — Mapper ClientRef (Phase 24)
// ==============================================================================

import type { InferSelectModel } from "drizzle-orm";

import { ClientRef } from "../../domain/client-ref.entity";

import type { clientsRef } from "./schema";

type ClientRefRow = InferSelectModel<typeof clientsRef>;

export interface ClientRefDTO {
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly actif: boolean;
  readonly createdAt: string;
}

export function toEntity(row: ClientRefRow): ClientRef {
  return ClientRef.rehydrate({
    codeClient: row.codeClient,
    raisonSociale: row.raisonSociale,
    actif: row.actif,
    createdAt: row.createdAt,
  });
}

export function toDTO(entity: ClientRef): ClientRefDTO {
  return {
    codeClient: entity.codeClient,
    raisonSociale: entity.raisonSociale,
    actif: entity.actif,
    createdAt: entity.createdAt.toISOString(),
  };
}
