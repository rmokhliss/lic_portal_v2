// ==============================================================================
// LIC v2 — LogHealthcheckImporteUseCase (Phase 10.B)
//
// Trace un import healthcheck. Statut IMPORTED si parse + applications volumes
// OK, ERREUR sinon (avec errorMessage). Pas d'audit (DEC-019).
// ==============================================================================

import { toDTO, type FichierLogDTO } from "../adapters/postgres/fichier-log.mapper";
import { FichierLog, type FichierStatut } from "../domain/fichier-log.entity";
import type { FichierLogRepository } from "../ports/fichier-log.repository";

export interface LogHealthcheckImporteInput {
  readonly licenceId: string;
  readonly path: string;
  readonly hash: string;
  readonly statut: Extract<FichierStatut, "IMPORTED" | "ERREUR">;
  readonly metadata?: Record<string, unknown>;
  readonly errorMessage?: string;
  readonly creePar?: string;
}

export class LogHealthcheckImporteUseCase {
  constructor(private readonly fichierLogRepository: FichierLogRepository) {}

  async execute(input: LogHealthcheckImporteInput): Promise<FichierLogDTO> {
    const entity = FichierLog.create({
      licenceId: input.licenceId,
      type: "HEALTHCHECK_IMPORTED",
      statut: input.statut,
      path: input.path,
      hash: input.hash,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
      ...(input.creePar !== undefined ? { creePar: input.creePar } : {}),
    });
    const persisted = await this.fichierLogRepository.save(entity);
    return toDTO(persisted);
  }
}
