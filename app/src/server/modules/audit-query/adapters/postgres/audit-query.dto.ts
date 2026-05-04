// ==============================================================================
// LIC v2 — DTO audit-query (Phase 7 étape 7.A)
//
// Surface JSON exposée aux Server Actions / UI pour l'historique. Sérialise
// les Date en ISO 8601 et expose before/after en `Record<string, unknown>`
// (déjà JSONB côté BD).
// ==============================================================================

import type { PersistedAuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";

export interface AuditEntryDTO {
  readonly id: string;
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly beforeData: Record<string, unknown> | null;
  readonly afterData: Record<string, unknown> | null;
  readonly userId: string;
  readonly userDisplay: string;
  readonly clientId: string | null;
  readonly clientDisplay: string | null;
  readonly ipAddress: string | null;
  readonly mode: string;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: string;
}

export interface AuditPageDTO {
  readonly items: readonly AuditEntryDTO[];
  readonly nextCursor: string | null;
}

export function toDTO(entry: PersistedAuditEntry): AuditEntryDTO {
  return {
    id: entry.id,
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    beforeData: entry.beforeData ?? null,
    afterData: entry.afterData ?? null,
    userId: entry.userId,
    userDisplay: entry.userDisplay ?? "",
    clientId: entry.clientId ?? null,
    clientDisplay: entry.clientDisplay ?? null,
    ipAddress: entry.ipAddress ?? null,
    mode: entry.mode,
    metadata: entry.metadata ?? null,
    createdAt: entry.createdAt.toISOString(),
  };
}
