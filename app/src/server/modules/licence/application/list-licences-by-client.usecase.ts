// ==============================================================================
// LIC v2 — ListLicencesByClientUseCase (Phase 5). Cursor pagination.
// ==============================================================================

import { toDTO, type LicenceDTO } from "../adapters/postgres/licence.mapper";
import type { LicenceStatus } from "../domain/licence.entity";
import type { FindLicencesPaginatedInput, LicenceRepository } from "../ports/licence.repository";

export interface ListLicencesByClientUseCaseInput {
  readonly clientId: string;
  readonly status?: LicenceStatus | readonly LicenceStatus[];
  readonly cursor?: string;
  readonly limit?: number;
}

export interface ListLicencesByClientUseCaseOutput {
  readonly items: readonly LicenceDTO[];
  readonly nextCursor: string | null;
  readonly effectiveLimit: number;
}

export class ListLicencesByClientUseCase {
  constructor(private readonly licenceRepository: LicenceRepository) {}

  async execute(
    input: ListLicencesByClientUseCaseInput,
  ): Promise<ListLicencesByClientUseCaseOutput> {
    const opts: FindLicencesPaginatedInput = {
      clientId: input.clientId,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    };
    const result = await this.licenceRepository.findPaginated(opts);
    return {
      items: result.items.map(toDTO),
      nextCursor: result.nextCursor,
      effectiveLimit: result.effectiveLimit,
    };
  }
}
