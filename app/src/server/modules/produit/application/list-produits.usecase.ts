// ==============================================================================
// LIC v2 — ListProduitsUseCase (Phase 6 étape 6.B)
// Read-only, pas d'audit, ORDER BY code ASC.
// ==============================================================================

import { toDTO, type ProduitDTO } from "../adapters/postgres/produit.mapper";
import type { FindAllProduitsOptions, ProduitRepository } from "../ports/produit.repository";

export type ListProduitsInput = FindAllProduitsOptions;

export class ListProduitsUseCase {
  constructor(private readonly produitRepository: ProduitRepository) {}

  async execute(input: ListProduitsInput = {}): Promise<readonly ProduitDTO[]> {
    const produits = await this.produitRepository.findAll(input);
    return produits.map(toDTO);
  }
}
