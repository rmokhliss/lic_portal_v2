// ==============================================================================
// LIC v2 — GetDeviseUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type DeviseDTO } from "../adapters/postgres/devise.mapper";
import { Devise } from "../domain/devise.entity";
import { deviseNotFoundByCode } from "../domain/devise.errors";
import type { DeviseRepository } from "../ports/devise.repository";

export class GetDeviseUseCase {
  constructor(private readonly deviseRepository: DeviseRepository) {}

  async execute(codeDevise: string): Promise<DeviseDTO> {
    Devise.validateCodeDevise(codeDevise);
    const devise = await this.deviseRepository.findByCode(codeDevise);
    if (devise === null) {
      throw deviseNotFoundByCode(codeDevise);
    }
    return toDTO(devise);
  }
}
