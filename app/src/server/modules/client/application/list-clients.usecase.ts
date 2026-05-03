// ==============================================================================
// LIC v2 — ListClientsUseCase (Phase 4 étape 4.B)
//
// Read-only, cursor-based pagination (Référentiel §4.15). Le repo gère la
// décode/encode du cursor + détection page suivante via LIMIT+1.
// FTS optionnel via `q` → search_vector @@ plainto_tsquery (ADR 0004).
// ==============================================================================

import { toDTO, type ClientDTO } from "../adapters/postgres/client.mapper";
import type { ClientStatut } from "../domain/client.entity";
import type { ClientRepository, FindClientsPaginatedInput } from "../ports/client.repository";

export interface ListClientsUseCaseInput {
  readonly actif?: boolean;
  readonly statutClient?: ClientStatut | readonly ClientStatut[];
  readonly q?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface ListClientsUseCaseOutput {
  readonly items: readonly ClientDTO[];
  readonly nextCursor: string | null;
  readonly effectiveLimit: number;
}

export class ListClientsUseCase {
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(input: ListClientsUseCaseInput = {}): Promise<ListClientsUseCaseOutput> {
    const opts: FindClientsPaginatedInput = {
      ...(input.actif !== undefined ? { actif: input.actif } : {}),
      ...(input.statutClient !== undefined ? { statutClient: input.statutClient } : {}),
      ...(input.q !== undefined ? { q: input.q } : {}),
      ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    };

    const result = await this.clientRepository.findPaginated(opts);
    return {
      items: result.items.map(toDTO),
      nextCursor: result.nextCursor,
      effectiveLimit: result.effectiveLimit,
    };
  }
}
