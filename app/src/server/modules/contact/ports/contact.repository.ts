// ==============================================================================
// LIC v2 — Port ContactRepository (Phase 4 étape 4.C)
// Hard delete (CASCADE BD via FK lic_entites). Pas de soft delete.
// ==============================================================================

import type { Contact, PersistedContact } from "../domain/contact.entity";

export type DbTransaction = unknown;

export abstract class ContactRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedContact | null>;

  /** Liste des contacts d'une entité, ordre par typeContactCode + nom ASC.
   *  Pas de cursor (volume <20 par entité). */
  abstract findByEntite(entiteId: string, tx?: DbTransaction): Promise<readonly PersistedContact[]>;

  abstract save(contact: Contact, actorId: string, tx?: DbTransaction): Promise<PersistedContact>;

  abstract update(contact: PersistedContact, actorId: string, tx?: DbTransaction): Promise<void>;

  /** Hard delete (DELETE FROM …). La trace reste dans l'audit log. */
  abstract delete(id: string, tx?: DbTransaction): Promise<void>;
}
