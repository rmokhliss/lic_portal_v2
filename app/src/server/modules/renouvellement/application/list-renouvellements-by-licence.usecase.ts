// ==============================================================================
// LIC v2 — ListRenouvellementsByLicenceUseCase (Phase 5)
// Read-only, pas de cursor (volume <10 par licence).
// ==============================================================================

import { toDTO, type RenouvellementDTO } from "../adapters/postgres/renouvellement.mapper";
import type { RenouvellementRepository } from "../ports/renouvellement.repository";

export class ListRenouvellementsByLicenceUseCase {
  constructor(private readonly renouvellementRepository: RenouvellementRepository) {}

  async execute(licenceId: string): Promise<readonly RenouvellementDTO[]> {
    const list = await this.renouvellementRepository.findByLicence(licenceId);
    return list.map(toDTO);
  }
}
