// ==============================================================================
// LIC v2 — Port AuditRepository (F-08, refactor de F-07 AuditRecorder)
//
// Surface 3 méthodes :
//   - save(entry, tx?)        : persistance (utilisée par caller transactionnel)
//   - findById(id, tx?)       : lookup unitaire (drill-down EC-06)
//   - search(filters, tx?)    : recherche FTS + filtres + pagination cursor
//
// Travaille en termes d'AuditEntry / PersistedAuditEntry (entités du domaine),
// pas de DTO d'input — pattern hexagonal canonique.
// ==============================================================================

import type { AuditEntry, AuditMode, PersistedAuditEntry } from "../domain/audit-entry.entity";

export type { AuditMode };

/** Transaction Drizzle Postgres-js (typage opaque pour ne pas coupler le port
 *  à l'API privée Drizzle qui change entre versions). L'adapter cast en interne. */
export type DbTransaction = unknown;

export interface SearchAuditFilters {
  /** FTS plainto_tsquery français. Match sur entity, action, user_display,
   *  client_display, before_data::text, after_data::text (cf. F-06 GENERATED). */
  readonly query?: string;
  readonly entity?: string;
  readonly entityId?: string;
  readonly userId?: string;
  readonly clientId?: string;
  readonly mode?: AuditMode;
  readonly fromDate?: Date;
  readonly toDate?: Date;
  /** Cursor base64url (cf. infrastructure/db/cursor.ts). */
  readonly cursor?: string;
  /** Default 50, cap silencieux à 200 par le use-case (Référentiel §4.15). */
  readonly limit?: number;
}

export interface AuditPage {
  readonly items: readonly PersistedAuditEntry[];
  /** Encodé via encodeCursor(lastItem.createdAt, lastItem.id). null si fin. */
  readonly nextCursor: string | null;
  /** Limite réellement appliquée après cap (signal au caller qu'on a tronqué
   *  silencieusement si demande > 200). */
  readonly effectiveLimit: number;
}

export abstract class AuditRepository {
  abstract save(entry: AuditEntry, tx?: DbTransaction): Promise<void>;
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedAuditEntry | null>;
  abstract search(filters: SearchAuditFilters, tx?: DbTransaction): Promise<AuditPage>;
}
