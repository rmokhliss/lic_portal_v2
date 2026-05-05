// ==============================================================================
// LIC v2 — ListFichiersByLicenceUseCase (Phase 10.B + Phase 16 audit lectures)
//
// Phase 16 — DETTE-LIC-022 : audit FICHIER_LOG_READ best-effort si actorId
// fourni + ports audit/user câblés. Rétrocompatible.
// ==============================================================================

import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";
import { createChildLogger } from "@/server/infrastructure/logger";

import { toDTO, type FichierLogDTO } from "../adapters/postgres/fichier-log.mapper";
import type { FichierLogRepository } from "../ports/fichier-log.repository";

const log = createChildLogger("list-fichiers-by-licence");

export class ListFichiersByLicenceUseCase {
  constructor(
    private readonly fichierLogRepository: FichierLogRepository,
    /** Phase 16 — optionnels pour rétrocompat. Câblés en composition-root. */
    private readonly auditRepository?: AuditRepository,
    private readonly userRepository?: UserRepository,
  ) {}

  async execute(licenceId: string, actorId?: string): Promise<readonly FichierLogDTO[]> {
    const fichiers = await this.fichierLogRepository.findByLicence(licenceId);

    if (
      actorId !== undefined &&
      this.auditRepository !== undefined &&
      this.userRepository !== undefined
    ) {
      try {
        const actor = await this.userRepository.findByIdEntity(actorId);
        if (actor !== null) {
          const entry = AuditEntry.create({
            entity: "fichier-log",
            entityId: licenceId,
            action: "FICHIER_LOG_READ",
            afterData: { count: fichiers.length },
            userId: actor.id,
            userDisplay: actor.toDisplay(),
            mode: "MANUEL",
          });
          await this.auditRepository.save(entry);
        }
      } catch (err) {
        log.warn(
          {
            event: "audit_read_failed",
            licenceId,
            error: err instanceof Error ? err.message : String(err),
          },
          "Échec audit FICHIER_LOG_READ best-effort (lecture OK)",
        );
      }
    }

    return fichiers.map(toDTO);
  }
}
