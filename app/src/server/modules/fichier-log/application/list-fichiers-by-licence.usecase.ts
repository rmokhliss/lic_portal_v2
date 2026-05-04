// ==============================================================================
// LIC v2 — ListFichiersByLicenceUseCase (Phase 10.B)
// Read-only.
// ==============================================================================

import { toDTO, type FichierLogDTO } from "../adapters/postgres/fichier-log.mapper";
import type { FichierLogRepository } from "../ports/fichier-log.repository";

export class ListFichiersByLicenceUseCase {
  constructor(private readonly fichierLogRepository: FichierLogRepository) {}

  async execute(licenceId: string): Promise<readonly FichierLogDTO[]> {
    const fichiers = await this.fichierLogRepository.findByLicence(licenceId);
    return fichiers.map(toDTO);
  }
}
