// ==============================================================================
// LIC v2 — CreateDeviseUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type DeviseDTO } from "../adapters/postgres/devise.mapper";
import { Devise, type CreateDeviseInput as DomainCreateInput } from "../domain/devise.entity";
import { deviseCodeAlreadyExists } from "../domain/devise.errors";
import type { DeviseRepository } from "../ports/devise.repository";

export type CreateDeviseUseCaseInput = DomainCreateInput;

export class CreateDeviseUseCase {
  constructor(private readonly deviseRepository: DeviseRepository) {}

  async execute(input: CreateDeviseUseCaseInput): Promise<DeviseDTO> {
    const devise = Devise.create(input);
    const existing = await this.deviseRepository.findByCode(devise.codeDevise);
    if (existing !== null) {
      throw deviseCodeAlreadyExists(devise.codeDevise);
    }
    const persisted = await this.deviseRepository.save(devise);
    return toDTO(persisted);
  }
}
