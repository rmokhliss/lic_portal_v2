// ==============================================================================
// LIC v2 — Port AuditRecorder (F-07 minimal, γ)
//
// Contrat d'enregistrement audit. F-07 implémente uniquement l'INSERT.
// F-08 enrichira (domain entity, application use-case avec FTS search), sans
// casser cette interface (additif possible).
//
// Règle L3 (PROJECT_CONTEXT) : record() doit être appelé dans la MÊME
// transaction que la mutation métier — d'où le paramètre tx optionnel.
// ==============================================================================

export type AuditMode = "MANUEL" | "API" | "JOB";

export interface RecordAuditInput {
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  /** UUID utilisateur. Pour les actions automatisées : SYSTEM_USER_ID (nil UUID
   *  RFC 9562 — cf. shared/src/constants/system-user.ts). */
  readonly userId: string;
  readonly userDisplay?: string;
  readonly clientId?: string;
  readonly clientDisplay?: string;
  readonly ipAddress?: string;
  readonly mode: AuditMode;
  readonly metadata?: Record<string, unknown>;
}

/** Transaction Drizzle Postgres-js (typage fluide minimal pour éviter le couplage
 *  fort à l'API privée Drizzle). L'implémentation cast en interne. */
export type DbTransaction = unknown;

export abstract class AuditRecorder {
  abstract record(input: RecordAuditInput, tx?: DbTransaction): Promise<void>;
}
