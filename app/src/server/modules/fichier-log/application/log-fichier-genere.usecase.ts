// ==============================================================================
// LIC v2 — LogFichierGenereUseCase (Phase 10.B)
//
// Trace une génération .lic. Pas d'audit (DEC-019). Pas de tx interne — la
// génération + le log forment 1 séquence atomique côté caller (use-case
// generate-licence-fichier Phase 10.C).
// ==============================================================================

import { toDTO, type FichierLogDTO } from "../adapters/postgres/fichier-log.mapper";
import { FichierLog } from "../domain/fichier-log.entity";
import type { FichierLogRepository } from "../ports/fichier-log.repository";

export interface LogFichierGenereInput {
  readonly licenceId: string;
  readonly path: string;
  readonly hash: string;
  readonly metadata?: Record<string, unknown>;
  readonly creePar?: string;
}

export class LogFichierGenereUseCase {
  constructor(private readonly fichierLogRepository: FichierLogRepository) {}

  async execute(input: LogFichierGenereInput): Promise<FichierLogDTO> {
    const entity = FichierLog.create({
      licenceId: input.licenceId,
      type: "LIC_GENERATED",
      statut: "GENERATED",
      path: input.path,
      hash: input.hash,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      ...(input.creePar !== undefined ? { creePar: input.creePar } : {}),
    });
    const persisted = await this.fichierLogRepository.save(entity);
    return toDTO(persisted);
  }
}
