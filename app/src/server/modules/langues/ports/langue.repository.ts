// ==============================================================================
// LIC v2 — Port LangueRepository (Phase 2.B étape 3/7)
// ==============================================================================

import type { Langue, PersistedLangue } from "../domain/langue.entity";

export type DbTransaction = unknown;

export interface FindAllLanguesOptions {
  readonly actif?: boolean;
}

export abstract class LangueRepository {
  abstract findAll(
    opts?: FindAllLanguesOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedLangue[]>;

  abstract findByCode(codeLangue: string, tx?: DbTransaction): Promise<PersistedLangue | null>;
  abstract save(langue: Langue, tx?: DbTransaction): Promise<PersistedLangue>;
  abstract update(langue: PersistedLangue, tx?: DbTransaction): Promise<void>;
}
