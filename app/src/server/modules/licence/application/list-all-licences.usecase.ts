// ==============================================================================
// LIC v2 — ListAllLicencesUseCase (T-03 — page /licences globale)
//
// Variante de ListLicencesByClientUseCase sans filtre client : pagination
// cursor sur toutes les licences. Utilisé par la page /licences (vue cross-
// clients pour ADMIN/SADMIN, recherche globale).
// ==============================================================================

import { toDTO, type LicenceDTO } from "../adapters/postgres/licence.mapper";
import type { LicenceStatus } from "../domain/licence.entity";
import type { FindLicencesPaginatedInput, LicenceRepository } from "../ports/licence.repository";

export interface ListAllLicencesUseCaseInput {
  readonly clientId?: string;
  readonly status?: LicenceStatus | readonly LicenceStatus[];
  /** Recherche sous-chaîne sur reference (T-03 — page /licences). */
  readonly q?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface ListAllLicencesUseCaseOutput {
  readonly items: readonly LicenceDTO[];
  readonly nextCursor: string | null;
  readonly effectiveLimit: number;
}

export class ListAllLicencesUseCase {
  constructor(private readonly licenceRepository: LicenceRepository) {}

  async execute(input: ListAllLicencesUseCaseInput): Promise<ListAllLicencesUseCaseOutput> {
    const opts: FindLicencesPaginatedInput = {
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.q !== undefined ? { q: input.q } : {}),
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
