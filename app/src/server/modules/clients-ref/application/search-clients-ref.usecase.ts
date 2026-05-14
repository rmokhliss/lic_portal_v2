// ==============================================================================
// LIC v2 — SearchClientsRefUseCase (Phase 24)
//
// Autocomplete /clients/new : recherche dans `lic_clients_ref` par code OU
// raison sociale (ILIKE %q%). Limite imposée par l'adapter (20 résultats).
// ==============================================================================

import { toDTO, type ClientRefDTO } from "../adapters/postgres/client-ref.mapper";
import type { ClientRefRepository, SearchClientsRefOptions } from "../ports/client-ref.repository";

export type SearchClientsRefInput = SearchClientsRefOptions;

export class SearchClientsRefUseCase {
  constructor(private readonly clientRefRepository: ClientRefRepository) {}

  async execute(input: SearchClientsRefInput): Promise<readonly ClientRefDTO[]> {
    const results = await this.clientRefRepository.search(input);
    return results.map(toDTO);
  }
}
