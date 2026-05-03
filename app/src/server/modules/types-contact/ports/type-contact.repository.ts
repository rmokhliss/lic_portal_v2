// ==============================================================================
// LIC v2 — Port TypeContactRepository (Phase 2.B étape 3/7)
// ==============================================================================

import type { PersistedTypeContact, TypeContact } from "../domain/type-contact.entity";

export type DbTransaction = unknown;

export interface FindAllTypesContactOptions {
  readonly actif?: boolean;
}

export abstract class TypeContactRepository {
  abstract findAll(
    opts?: FindAllTypesContactOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedTypeContact[]>;

  abstract findByCode(code: string, tx?: DbTransaction): Promise<PersistedTypeContact | null>;
  abstract save(typeContact: TypeContact, tx?: DbTransaction): Promise<PersistedTypeContact>;
  abstract update(typeContact: PersistedTypeContact, tx?: DbTransaction): Promise<void>;
}
