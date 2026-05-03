// ==============================================================================
// LIC v2 — GetPaysUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type PaysDTO } from "../adapters/postgres/pays.mapper";
import { Pays } from "../domain/pays.entity";
import { paysNotFoundByCode } from "../domain/pays.errors";
import type { PaysRepository } from "../ports/pays.repository";

export class GetPaysUseCase {
  constructor(private readonly paysRepository: PaysRepository) {}

  async execute(codePays: string): Promise<PaysDTO> {
    Pays.validateCodePays(codePays);
    const pays = await this.paysRepository.findByCode(codePays);
    if (pays === null) {
      throw paysNotFoundByCode(codePays);
    }
    return toDTO(pays);
  }
}
