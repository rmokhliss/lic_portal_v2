// ==============================================================================
// LIC v2 — GetAuditEntryByIdUseCase (F-08)
//
// Lookup unitaire pour drill-down EC-06.
// ==============================================================================

import { NotFoundError, ValidationError } from "@/server/modules/error";
import type { PersistedAuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GetAuditEntryByIdUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  /** Throw ValidationError SPX-LIC-500 si id n'est pas un UUID valide.
   *  Throw NotFoundError SPX-LIC-501 si l'entrée n'existe pas en BD. */
  async execute(id: string): Promise<PersistedAuditEntry> {
    if (!UUID_REGEX.test(id)) {
      throw new ValidationError({
        code: "SPX-LIC-500",
        message: `id non-UUID : "${id}"`,
      });
    }

    const entry = await this.auditRepository.findById(id);
    if (entry === null) {
      throw new NotFoundError({
        code: "SPX-LIC-501",
        message: `Aucune entrée d'audit avec id ${id}`,
      });
    }

    return entry;
  }
}
