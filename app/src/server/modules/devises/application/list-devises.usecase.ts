// ==============================================================================
// LIC v2 — ListDevisesUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type DeviseDTO } from "../adapters/postgres/devise.mapper";
import type { DeviseRepository, FindAllDevisesOptions } from "../ports/devise.repository";

export type ListDevisesInput = FindAllDevisesOptions;

export class ListDevisesUseCase {
  constructor(private readonly deviseRepository: DeviseRepository) {}

  async execute(input: ListDevisesInput = {}): Promise<readonly DeviseDTO[]> {
    const all = await this.deviseRepository.findAll(input);
    return all.map(toDTO);
  }
}
