// ==============================================================================
// LIC v2 — GetRenouvellementUseCase (Phase 5)
// ==============================================================================

import { toDTO, type RenouvellementDTO } from "../adapters/postgres/renouvellement.mapper";
import { renouvellementNotFoundById } from "../domain/renouvellement.errors";
import type { RenouvellementRepository } from "../ports/renouvellement.repository";

export class GetRenouvellementUseCase {
  constructor(private readonly renouvellementRepository: RenouvellementRepository) {}

  async execute(id: string): Promise<RenouvellementDTO> {
    const r = await this.renouvellementRepository.findById(id);
    if (r === null) throw renouvellementNotFoundById(id);
    return toDTO(r);
  }
}
