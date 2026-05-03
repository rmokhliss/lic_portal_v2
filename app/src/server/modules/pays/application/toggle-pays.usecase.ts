// ==============================================================================
// LIC v2 — TogglePaysUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type PaysDTO } from "../adapters/postgres/pays.mapper";
import { paysNotFoundByCode } from "../domain/pays.errors";
import type { PaysRepository } from "../ports/pays.repository";

export class TogglePaysUseCase {
  constructor(private readonly paysRepository: PaysRepository) {}

  async execute(codePays: string): Promise<PaysDTO> {
    const existing = await this.paysRepository.findByCode(codePays);
    if (existing === null) {
      throw paysNotFoundByCode(codePays);
    }
    const toggled = existing.toggle();
    await this.paysRepository.update(toggled);
    return toDTO(toggled);
  }
}
