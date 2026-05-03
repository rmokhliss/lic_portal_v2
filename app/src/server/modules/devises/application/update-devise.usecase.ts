// ==============================================================================
// LIC v2 — UpdateDeviseUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type DeviseDTO } from "../adapters/postgres/devise.mapper";
import { deviseNotFoundByCode } from "../domain/devise.errors";
import type { DeviseRepository } from "../ports/devise.repository";

export interface UpdateDeviseUseCaseInput {
  readonly codeDevise: string;
  readonly nom?: string;
  readonly symbole?: string | null;
}

export class UpdateDeviseUseCase {
  constructor(private readonly deviseRepository: DeviseRepository) {}

  async execute(input: UpdateDeviseUseCaseInput): Promise<DeviseDTO> {
    const existing = await this.deviseRepository.findByCode(input.codeDevise);
    if (existing === null) {
      throw deviseNotFoundByCode(input.codeDevise);
    }

    let updated = existing;
    if (input.nom !== undefined) {
      updated = updated.withName(input.nom);
    }
    if ("symbole" in input) {
      updated = updated.withSymbole(input.symbole);
    }

    await this.deviseRepository.update(updated);
    return toDTO(updated);
  }
}
