// ==============================================================================
// LIC v2 — Port AuditQueryRepository (Phase 7 étape 7.A)
//
// Lecture seule, distinct du AuditRepository d'écriture (audit/ports/).
// Trois axes de requête :
//
//   - listByEntity         : audit direct sur (entity, entityId) — drill-down
//   - listByClientScope    : audit "tout ce qui touche un client" — direct
//                            (entity='client', client_id=X) + indirect via
//                            entites/contacts/licences/renouvellements/
//                            licence-produits/licence-articles
//   - listByLicenceScope   : audit "tout ce qui touche une licence" — direct
//                            (entity='licence', entity_id=X) + indirect via
//                            licence-produits/licence-articles/renouvellements
//   - search               : recherche globale (réplique surface AuditRepository
//                            mais accessible côté read-only sans expose d'écriture)
//
// Cursor pagination réutilise infrastructure/db/cursor (uuidv7 → ORDER BY id DESC).
// Pas d'audit sur les lectures (évidemment).
// ==============================================================================

import type {
  AuditMode,
  PersistedAuditEntry,
} from "@/server/modules/audit/domain/audit-entry.entity";

export type DbTransaction = unknown;

export interface AuditQueryFilters {
  /** FTS plainto_tsquery français (search_vector GENERATED). */
  readonly query?: string;
  readonly action?: string;
  readonly userId?: string;
  /** ILIKE %x% sur user_display — filtre "acteur" texte de l'UI Historique. */
  readonly userDisplayLike?: string;
  readonly entity?: string;
  readonly mode?: AuditMode;
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface AuditPage {
  readonly items: readonly PersistedAuditEntry[];
  readonly nextCursor: string | null;
  readonly effectiveLimit: number;
}

export abstract class AuditQueryRepository {
  /** Audit direct sur une entité (entity + entityId). */
  abstract listByEntity(
    entity: string,
    entityId: string,
    filters?: AuditQueryFilters,
    tx?: DbTransaction,
  ): Promise<AuditPage>;

  /** Audit "scope client" : direct + via entites/contacts/licences/
   *  licence-produits/licence-articles/renouvellements appartenant à ce client. */
  abstract listByClientScope(
    clientId: string,
    filters?: AuditQueryFilters,
    tx?: DbTransaction,
  ): Promise<AuditPage>;

  /** Audit "scope licence" : direct + via licence-produits/licence-articles/
   *  renouvellements appartenant à cette licence. */
  abstract listByLicenceScope(
    licenceId: string,
    filters?: AuditQueryFilters,
    tx?: DbTransaction,
  ): Promise<AuditPage>;

  /** Recherche globale — surface équivalente à AuditRepository.search()
   *  exposée côté read-only pour les Server Actions de la page /audit. */
  abstract search(filters: AuditQueryFilters, tx?: DbTransaction): Promise<AuditPage>;

  /** Compte total matchant les filtres — utilisé par l'export CSV pour
   *  refuser un export > seuil (SPX-LIC-755). */
  abstract count(filters: AuditQueryFilters, tx?: DbTransaction): Promise<number>;
}
