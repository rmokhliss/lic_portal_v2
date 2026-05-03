// ==============================================================================
// LIC v2 — ListPaysUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type PaysDTO } from "../adapters/postgres/pays.mapper";
import type { FindAllPaysOptions, PaysRepository } from "../ports/pays.repository";

export type ListPaysInput = FindAllPaysOptions;

export class ListPaysUseCase {
  constructor(private readonly paysRepository: PaysRepository) {}

  async execute(input: ListPaysInput = {}): Promise<readonly PaysDTO[]> {
    const all = await this.paysRepository.findAll(input);
    return all.map(toDTO);
  }
}
