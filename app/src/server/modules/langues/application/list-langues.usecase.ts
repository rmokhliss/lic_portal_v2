// ==============================================================================
// LIC v2 — ListLanguesUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type LangueDTO } from "../adapters/postgres/langue.mapper";
import type { FindAllLanguesOptions, LangueRepository } from "../ports/langue.repository";

export type ListLanguesInput = FindAllLanguesOptions;

export class ListLanguesUseCase {
  constructor(private readonly langueRepository: LangueRepository) {}

  async execute(input: ListLanguesInput = {}): Promise<readonly LangueDTO[]> {
    const all = await this.langueRepository.findAll(input);
    return all.map(toDTO);
  }
}
