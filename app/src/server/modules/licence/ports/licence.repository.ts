// ==============================================================================
// LIC v2 — Port LicenceRepository (Phase 5 étape 5.B)
//
// Surface :
//   - findById(id, tx?)                     → PersistedLicence | null
//   - findByReference(ref, tx?)             → idem
//   - findPaginated(opts, tx?)              → cursor pagination par client
//   - allocateNextReference(tx?)            → "LIC-{YYYY}-{NNN}" (NNN = max+1
//                                              filtré sur l'année courante)
//   - save(licence, actorId, tx?)           → INSERT
//   - update(licence, expectedVersion, actorId, tx?) → optimistic lock L4
// ==============================================================================

import type { Licence, LicenceStatus, PersistedLicence } from "../domain/licence.entity";

export type DbTransaction = unknown;

export interface FindLicencesPaginatedInput {
  readonly clientId?: string;
  readonly entiteId?: string;
  readonly status?: LicenceStatus | readonly LicenceStatus[];
  readonly cursor?: string;
  readonly limit?: number;
}

export interface FindLicencesPaginatedOutput {
  readonly items: readonly PersistedLicence[];
  readonly nextCursor: string | null;
  readonly effectiveLimit: number;
}

export abstract class LicenceRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedLicence | null>;

  abstract findByReference(reference: string, tx?: DbTransaction): Promise<PersistedLicence | null>;

  abstract findPaginated(
    input: FindLicencesPaginatedInput,
    tx?: DbTransaction,
  ): Promise<FindLicencesPaginatedOutput>;

  /** Alloue la prochaine référence "LIC-{YYYY}-{NNN}" pour l'année courante.
   *  Format strict : 3+ digits zéro-paddés (NNN >= 001). MAX(reference) parsé
   *  filtré sur LIC-{YYYY}-* puis incrémenté +1. Race possible (lecture+insert
   *  non-atomic), acceptable mono-tenant volume modéré ; en cas de collision
   *  l'INSERT échoue sur uq_licences_reference et le caller peut retry. */
  abstract allocateNextReference(tx?: DbTransaction): Promise<string>;

  abstract save(licence: Licence, actorId: string, tx?: DbTransaction): Promise<PersistedLicence>;

  abstract update(
    licence: PersistedLicence,
    expectedVersion: number,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedLicence>;
}
