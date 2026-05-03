// ==============================================================================
// LIC v2 — Port PaysRepository (Phase 2.B étape 3/7)
//
// Spécificité vs RegionRepository : FindAllPaysOptions ajoute un filtre
// optionnel `regionCode` (consulter les pays d'une région — usage probable
// EC-Clients Phase 4).
//
// Volume <200 lignes attendu — pas de pagination.
// ==============================================================================

import type { PersistedPays, Pays } from "../domain/pays.entity";

export type DbTransaction = unknown;

export interface FindAllPaysOptions {
  readonly actif?: boolean;
  readonly regionCode?: string;
}

export abstract class PaysRepository {
  abstract findAll(
    opts?: FindAllPaysOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedPays[]>;

  abstract findByCode(codePays: string, tx?: DbTransaction): Promise<PersistedPays | null>;
  abstract save(pays: Pays, tx?: DbTransaction): Promise<PersistedPays>;
  abstract update(pays: PersistedPays, tx?: DbTransaction): Promise<void>;
}
