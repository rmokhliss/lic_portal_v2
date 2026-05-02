// ==============================================================================
// LIC v2 — Mapper Postgres ↔ AuditEntry (F-08)
//
// toDbInsert : AuditEntry → row Drizzle pour INSERT (sans id ni createdAt,
//              générés par BD via uuidv7() et defaultNow()).
// fromDb     : row Drizzle → PersistedAuditEntry (rehydrate sans validation).
// ==============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import {
  AuditEntry,
  type PersistedAuditEntry,
} from "@/server/modules/audit/domain/audit-entry.entity";

import type { auditLog } from "./schema";

type AuditRow = InferSelectModel<typeof auditLog>;
type AuditInsert = InferInsertModel<typeof auditLog>;

export function toDbInsert(entry: AuditEntry): AuditInsert {
  return {
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    beforeData: entry.beforeData,
    afterData: entry.afterData,
    userId: entry.userId,
    userDisplay: entry.userDisplay,
    clientId: entry.clientId,
    clientDisplay: entry.clientDisplay,
    ipAddress: entry.ipAddress,
    mode: entry.mode,
    metadata: entry.metadata,
    // id, createdAt : générés par BD (uuidv7() + defaultNow()).
    // search_vector : GENERATED ALWAYS STORED côté BD (cf. F-06 migration).
  };
}

export function fromDb(row: AuditRow): PersistedAuditEntry {
  return AuditEntry.rehydrate({
    id: row.id,
    createdAt: row.createdAt,
    entity: row.entity,
    entityId: row.entityId,
    action: row.action,
    beforeData: row.beforeData ?? undefined,
    afterData: row.afterData ?? undefined,
    userId: row.userId,
    userDisplay: row.userDisplay ?? undefined,
    clientId: row.clientId ?? undefined,
    clientDisplay: row.clientDisplay ?? undefined,
    ipAddress: row.ipAddress ?? undefined,
    mode: row.mode,
    metadata: row.metadata ?? undefined,
  });
}
