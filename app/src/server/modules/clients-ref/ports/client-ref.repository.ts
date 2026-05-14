// ==============================================================================
// LIC v2 — Port ClientRefRepository (Phase 24)
//
// Référentiel lecture seule depuis l'UI. Pas de save/update/toggle — seuls
// le bootstrap seed et un éventuel SADMIN SQL direct alimentent la table.
//
// 3 méthodes exposées :
//   - findPaginated : tableau /settings/referentiels (offset + limit).
//   - findByCode    : check d'existence (autocomplete /clients/new).
//   - search        : autocomplete code OU raison sociale (ILIKE).
// ==============================================================================

import type { ClientRef } from "../domain/client-ref.entity";

export type DbTransaction = unknown;

export interface FindPaginatedClientsRefOptions {
  readonly actif?: boolean;
  readonly offset?: number;
  readonly limit?: number;
}

export interface FindPaginatedClientsRefResult {
  readonly items: readonly ClientRef[];
  readonly total: number;
}

export interface SearchClientsRefOptions {
  readonly query: string;
  readonly limit?: number;
  readonly actif?: boolean;
}

export abstract class ClientRefRepository {
  abstract findPaginated(
    opts?: FindPaginatedClientsRefOptions,
    tx?: DbTransaction,
  ): Promise<FindPaginatedClientsRefResult>;

  abstract findByCode(codeClient: string, tx?: DbTransaction): Promise<ClientRef | null>;

  abstract search(opts: SearchClientsRefOptions, tx?: DbTransaction): Promise<readonly ClientRef[]>;
}
