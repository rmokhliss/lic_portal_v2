// ==============================================================================
// LIC v2 — GetProduitUseCase (Phase 6 étape 6.B)
//
// Lookup par code business. Throw SPX-LIC-743 si absent.
// ==============================================================================

import { toDTO, type ProduitDTO } from "../adapters/postgres/produit.mapper";
import { Produit } from "../domain/produit.entity";
import { produitNotFoundByCode } from "../domain/produit.errors";
import type { ProduitRepository } from "../ports/produit.repository";

export class GetProduitUseCase {
  constructor(private readonly produitRepository: ProduitRepository) {}

  async execute(code: string): Promise<ProduitDTO> {
    Produit.validateCode(code);
    const produit = await this.produitRepository.findByCode(code);
    if (produit === null) throw produitNotFoundByCode(code);
    return toDTO(produit);
  }
}
