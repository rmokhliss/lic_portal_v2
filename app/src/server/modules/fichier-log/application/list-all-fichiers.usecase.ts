// ==============================================================================
// LIC v2 — ListAllFichiersUseCase (Phase 17 S2)
//
// Vue cross-licence des fichiers .lic générés et healthchecks importés.
// Read-only, MVP sans cursor (volume démo faible). Filtres optionnels :
// type, statut, période. Pas d'audit (DEC-019 — table fichier-log = trace).
// ==============================================================================

import { toDTO, type FichierLogDTO } from "../adapters/postgres/fichier-log.mapper";
import type { FichierLogRepository, FindAllFichiersFilters } from "../ports/fichier-log.repository";

export type ListAllFichiersInput = FindAllFichiersFilters;

export class ListAllFichiersUseCase {
  constructor(private readonly fichierLogRepository: FichierLogRepository) {}

  async execute(input: ListAllFichiersInput = {}): Promise<readonly FichierLogDTO[]> {
    const fichiers = await this.fichierLogRepository.findAllRecent(input);
    return fichiers.map(toDTO);
  }
}
