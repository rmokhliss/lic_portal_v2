// ==============================================================================
// LIC v2 — Port FichierLogRepository (Phase 10 étape 10.B)
// Append-only. Pas d'update/delete. Pas de cursor (volume <50 par licence).
// ==============================================================================

import type { FichierLog, PersistedFichierLog } from "../domain/fichier-log.entity";

export type DbTransaction = unknown;

export abstract class FichierLogRepository {
  abstract save(entity: FichierLog, tx?: DbTransaction): Promise<PersistedFichierLog>;
  abstract findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedFichierLog[]>;
}
