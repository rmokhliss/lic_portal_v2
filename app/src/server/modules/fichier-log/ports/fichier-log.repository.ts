// ==============================================================================
// LIC v2 — Port FichierLogRepository (Phase 10 étape 10.B + Phase 17 S2)
// Append-only. Pas d'update/delete. Pas de cursor (volume <50 par licence).
// Phase 17 S2 — `findAllRecent` : vue cross-licence pour /files (page admin
// MVP, volume faible côté démo, pas de cursor).
// ==============================================================================

import type {
  FichierLog,
  FichierStatut,
  FichierType,
  PersistedFichierLog,
} from "../domain/fichier-log.entity";

export type DbTransaction = unknown;

export interface FindAllFichiersFilters {
  readonly type?: FichierType;
  readonly statut?: FichierStatut;
  /** Filtre période : ne retourne que les fichiers `created_at >= since`. */
  readonly since?: Date;
  /** Filtre période : ne retourne que les fichiers `created_at <= until`. */
  readonly until?: Date;
  readonly limit?: number;
}

export abstract class FichierLogRepository {
  abstract save(entity: FichierLog, tx?: DbTransaction): Promise<PersistedFichierLog>;
  abstract findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedFichierLog[]>;
  abstract findAllRecent(
    filters?: FindAllFichiersFilters,
    tx?: DbTransaction,
  ): Promise<readonly PersistedFichierLog[]>;

  /** Phase 24 — comptage par type, utilisé par `delete-ca.usecase` pour
   *  bloquer la suppression de CA si des `.lic` ont été générés. */
  abstract countByType(type: FichierType, tx?: DbTransaction): Promise<number>;
}
