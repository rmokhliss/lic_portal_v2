// ==============================================================================
// LIC v2 — GetEntiteUseCase (Phase 4 étape 4.C). Read-only.
// ==============================================================================

import { toDTO, type EntiteDTO } from "../adapters/postgres/entite.mapper";
import { entiteNotFoundById } from "../domain/entite.errors";
import type { EntiteRepository } from "../ports/entite.repository";

export class GetEntiteUseCase {
  constructor(private readonly entiteRepository: EntiteRepository) {}

  async execute(id: string): Promise<EntiteDTO> {
    const entite = await this.entiteRepository.findById(id);
    if (entite === null) {
      throw entiteNotFoundById(id);
    }
    return toDTO(entite);
  }
}
