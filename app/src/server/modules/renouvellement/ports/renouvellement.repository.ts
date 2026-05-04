// ==============================================================================
// LIC v2 — Port RenouvellementRepository (Phase 5)
// ==============================================================================

import type { PersistedRenouvellement, Renouvellement } from "../domain/renouvellement.entity";

export type DbTransaction = unknown;

export abstract class RenouvellementRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedRenouvellement | null>;

  /** Liste des renouvellements d'une licence, ordre date_creation DESC.
   *  Pas de cursor (volume <10 par licence). */
  abstract findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedRenouvellement[]>;

  abstract save(
    renouvellement: Renouvellement,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedRenouvellement>;

  abstract update(renouvellement: PersistedRenouvellement, tx?: DbTransaction): Promise<void>;
}
