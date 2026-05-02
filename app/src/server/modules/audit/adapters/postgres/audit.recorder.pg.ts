// ==============================================================================
// LIC v2 — Adapter Postgres AuditRecorder (F-07 minimal, γ)
//
// Implémentation Drizzle de AuditRecorder. INSERT direct dans lic_audit_log.
// search_vector est calculé automatiquement côté BD (GENERATED ALWAYS STORED,
// cf. migration F-06).
//
// F-08 ajoutera l'orchestration domain/application — l'API publique de ce
// recorder reste stable (pattern Référentiel §4.13.2 ports stable).
// ==============================================================================

import type { PgDatabase } from "drizzle-orm/pg-core";

import { db } from "@/server/infrastructure/db/client";
import { auditLog } from "@/server/modules/audit/adapters/postgres/schema";
import {
  AuditRecorder,
  type DbTransaction,
  type RecordAuditInput,
} from "@/server/modules/audit/ports/audit.recorder";

export class AuditRecorderPg extends AuditRecorder {
  async record(input: RecordAuditInput, tx?: DbTransaction): Promise<void> {
    // tx (transaction caller) si fourni, sinon db (auto-commit single statement).
    // Le typage interne PgDatabase est suffisant pour .insert().values().
    const target = (tx as PgDatabase<never> | undefined) ?? db;

    await target.insert(auditLog).values({
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      beforeData: input.beforeData,
      afterData: input.afterData,
      userId: input.userId,
      userDisplay: input.userDisplay,
      clientId: input.clientId,
      clientDisplay: input.clientDisplay,
      ipAddress: input.ipAddress,
      mode: input.mode,
      metadata: input.metadata,
      // search_vector : NE PAS inclure (GENERATED ALWAYS STORED côté BD).
    });
  }
}
