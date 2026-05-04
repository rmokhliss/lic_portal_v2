// ==============================================================================
// LIC v2 — Port LicenceProduitRepository (Phase 6 étape 6.C)
// ==============================================================================

import type { LicenceProduit, PersistedLicenceProduit } from "../domain/licence-produit.entity";

export type DbTransaction = unknown;

export abstract class LicenceProduitRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedLicenceProduit | null>;

  abstract findByLicenceProduit(
    licenceId: string,
    produitId: number,
    tx?: DbTransaction,
  ): Promise<PersistedLicenceProduit | null>;

  abstract findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedLicenceProduit[]>;

  abstract save(
    entity: LicenceProduit,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedLicenceProduit>;

  abstract delete(id: string, tx?: DbTransaction): Promise<void>;
}
