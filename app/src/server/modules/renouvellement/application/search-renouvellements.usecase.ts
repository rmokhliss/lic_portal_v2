// ==============================================================================
// LIC v2 — SearchRenouvellementsUseCase (Phase 9.B)
// Page /renewals globale : list cross-clients avec filtres + cursor.
// Read-only (pas d'audit).
// ==============================================================================

import { toDTO, type RenouvellementDTO } from "../adapters/postgres/renouvellement.mapper";
import type {
  RenouvellementRepository,
  SearchRenouvellementsFilters,
} from "../ports/renouvellement.repository";

export type SearchRenouvellementsInput = SearchRenouvellementsFilters;

export interface SearchRenouvellementsOutput {
  readonly items: readonly RenouvellementDTO[];
  readonly nextCursor: string | null;
}

export class SearchRenouvellementsUseCase {
  constructor(private readonly renouvellementRepository: RenouvellementRepository) {}

  async execute(input: SearchRenouvellementsInput = {}): Promise<SearchRenouvellementsOutput> {
    const page = await this.renouvellementRepository.searchPaginated(input);
    return {
      items: page.items.map(toDTO),
      nextCursor: page.nextCursor,
    };
  }
}
