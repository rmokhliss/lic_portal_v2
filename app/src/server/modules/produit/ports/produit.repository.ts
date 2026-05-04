// ==============================================================================
// LIC v2 — Port ProduitRepository (Phase 6 étape 6.B)
//
// Surface 5 méthodes :
//   - findAll(opts?, tx?)  : liste, filtre actif optionnel, ORDER BY code ASC
//   - findById(id, tx?)    : lookup par id (FK target depuis articles_ref)
//   - findByCode(code, tx?): lookup par code business
//   - save(produit, tx?)   : INSERT, retourne PersistedProduit
//   - update(produit, tx?) : UPDATE complet
//
// Pas de pagination cursor (volume <50 produits prévus). Pas de delete (toggle).
// ==============================================================================

import type { PersistedProduit, Produit } from "../domain/produit.entity";

export type DbTransaction = unknown;

export interface FindAllProduitsOptions {
  readonly actif?: boolean;
}

export abstract class ProduitRepository {
  abstract findAll(
    opts?: FindAllProduitsOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedProduit[]>;

  abstract findById(id: number, tx?: DbTransaction): Promise<PersistedProduit | null>;

  abstract findByCode(code: string, tx?: DbTransaction): Promise<PersistedProduit | null>;

  abstract save(produit: Produit, tx?: DbTransaction): Promise<PersistedProduit>;

  abstract update(produit: PersistedProduit, tx?: DbTransaction): Promise<void>;
}
