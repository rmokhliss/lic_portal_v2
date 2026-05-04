// ==============================================================================
// LIC v2 — Port RenouvellementRepository (Phase 5 + Phase 9.B searchPaginated)
// ==============================================================================

import type {
  PersistedRenouvellement,
  Renouvellement,
  RenewStatus,
} from "../domain/renouvellement.entity";

export type DbTransaction = unknown;

export interface SearchRenouvellementsFilters {
  readonly status?: RenewStatus;
  readonly clientId?: string;
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface RenouvellementPage {
  readonly items: readonly PersistedRenouvellement[];
  readonly nextCursor: string | null;
}

export abstract class RenouvellementRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedRenouvellement | null>;

  /** Liste des renouvellements d'une licence, ordre date_creation DESC.
   *  Pas de cursor (volume <10 par licence). */
  abstract findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedRenouvellement[]>;

  /** Phase 9.B — recherche cross-clients pour la page /renewals globale.
   *  Filtre status / clientId (via JOIN licences) / période date_creation,
   *  cursor pagination via createdAt DESC + id DESC. */
  abstract searchPaginated(
    filters: SearchRenouvellementsFilters,
    tx?: DbTransaction,
  ): Promise<RenouvellementPage>;

  abstract save(
    renouvellement: Renouvellement,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedRenouvellement>;

  abstract update(renouvellement: PersistedRenouvellement, tx?: DbTransaction): Promise<void>;
}
