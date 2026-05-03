// ==============================================================================
// LIC v2 — ToggleDeviseUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type DeviseDTO } from "../adapters/postgres/devise.mapper";
import { deviseNotFoundByCode } from "../domain/devise.errors";
import type { DeviseRepository } from "../ports/devise.repository";

export class ToggleDeviseUseCase {
  constructor(private readonly deviseRepository: DeviseRepository) {}

  async execute(codeDevise: string): Promise<DeviseDTO> {
    const existing = await this.deviseRepository.findByCode(codeDevise);
    if (existing === null) {
      throw deviseNotFoundByCode(codeDevise);
    }
    const toggled = existing.toggle();
    await this.deviseRepository.update(toggled);
    return toDTO(toggled);
  }
}
