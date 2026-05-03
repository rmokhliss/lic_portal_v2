// ==============================================================================
// LIC v2 — Port DeviseRepository (Phase 2.B étape 3/7)
// ==============================================================================

import type { Devise, PersistedDevise } from "../domain/devise.entity";

export type DbTransaction = unknown;

export interface FindAllDevisesOptions {
  readonly actif?: boolean;
}

export abstract class DeviseRepository {
  abstract findAll(
    opts?: FindAllDevisesOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedDevise[]>;

  abstract findByCode(codeDevise: string, tx?: DbTransaction): Promise<PersistedDevise | null>;
  abstract save(devise: Devise, tx?: DbTransaction): Promise<PersistedDevise>;
  abstract update(devise: PersistedDevise, tx?: DbTransaction): Promise<void>;
}
