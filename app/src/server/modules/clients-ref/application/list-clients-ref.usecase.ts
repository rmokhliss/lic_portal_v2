// ==============================================================================
// LIC v2 — ListClientsRefUseCase (Phase 24)
//
// Liste paginée du référentiel `lic_clients_ref` pour l'écran
// /settings/referentiels (SADMIN, lecture seule).
// ==============================================================================

import { toDTO, type ClientRefDTO } from "../adapters/postgres/client-ref.mapper";
import type {
  ClientRefRepository,
  FindPaginatedClientsRefOptions,
} from "../ports/client-ref.repository";

export type ListClientsRefInput = FindPaginatedClientsRefOptions;

export interface ListClientsRefOutput {
  readonly items: readonly ClientRefDTO[];
  readonly total: number;
}

export class ListClientsRefUseCase {
  constructor(private readonly clientRefRepository: ClientRefRepository) {}

  async execute(input: ListClientsRefInput = {}): Promise<ListClientsRefOutput> {
    const { items, total } = await this.clientRefRepository.findPaginated(input);
    return { items: items.map(toDTO), total };
  }
}
