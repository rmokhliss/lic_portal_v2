// ==============================================================================
// LIC v2 — Port EntiteRepository (Phase 4 étape 4.C)
// ==============================================================================

import type { Entite, PersistedEntite } from "../domain/entite.entity";

export type DbTransaction = unknown;

export abstract class EntiteRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedEntite | null>;

  /** Liste complète des entités d'un client, ordre par nom ASC.
   *  Pas de cursor (volume <10 par client, brief 4.C). */
  abstract findByClient(clientId: string, tx?: DbTransaction): Promise<readonly PersistedEntite[]>;

  /** Lookup par couple (clientId, nom) — pour vérifier l'unique constraint
   *  uq_entites_client_nom avant INSERT (erreur métier typée 731). */
  abstract findByClientAndNom(
    clientId: string,
    nom: string,
    tx?: DbTransaction,
  ): Promise<PersistedEntite | null>;

  abstract save(entite: Entite, actorId: string, tx?: DbTransaction): Promise<PersistedEntite>;

  abstract update(entite: PersistedEntite, actorId: string, tx?: DbTransaction): Promise<void>;

  abstract updateActif(
    id: string,
    actif: boolean,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<void>;
}
