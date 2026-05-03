// ==============================================================================
// LIC v2 — ListEntitesByClientUseCase (Phase 4 étape 4.C)
// Read-only, pas de cursor (volume <10 par client). Ordre nom ASC.
// ==============================================================================

import { toDTO, type EntiteDTO } from "../adapters/postgres/entite.mapper";
import type { EntiteRepository } from "../ports/entite.repository";

export class ListEntitesByClientUseCase {
  constructor(private readonly entiteRepository: EntiteRepository) {}

  async execute(clientId: string): Promise<readonly EntiteDTO[]> {
    const entites = await this.entiteRepository.findByClient(clientId);
    return entites.map(toDTO);
  }
}
