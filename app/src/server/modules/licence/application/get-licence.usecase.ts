// ==============================================================================
// LIC v2 — GetLicenceUseCase (Phase 5). Read-only.
// ==============================================================================

import { toDTO, type LicenceDTO } from "../adapters/postgres/licence.mapper";
import { licenceNotFoundById } from "../domain/licence.errors";
import type { LicenceRepository } from "../ports/licence.repository";

export class GetLicenceUseCase {
  constructor(private readonly licenceRepository: LicenceRepository) {}

  async execute(id: string): Promise<LicenceDTO> {
    const licence = await this.licenceRepository.findById(id);
    if (licence === null) {
      throw licenceNotFoundById(id);
    }
    return toDTO(licence);
  }
}
