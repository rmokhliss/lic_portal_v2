// ==============================================================================
// LIC v2 — CreateProduitUseCase (Phase 6 étape 6.B)
// Pas d'audit (R-27). Conflit unicité business via SPX-LIC-744 + UNIQUE BD.
// ==============================================================================

import { toDTO, type ProduitDTO } from "../adapters/postgres/produit.mapper";
import { Produit, type CreateProduitInput as DomainCreateInput } from "../domain/produit.entity";
import { produitCodeAlreadyExists } from "../domain/produit.errors";
import type { ProduitRepository } from "../ports/produit.repository";

export type CreateProduitUseCaseInput = DomainCreateInput;

export class CreateProduitUseCase {
  constructor(private readonly produitRepository: ProduitRepository) {}

  async execute(input: CreateProduitUseCaseInput): Promise<ProduitDTO> {
    const produit = Produit.create(input);

    const existing = await this.produitRepository.findByCode(produit.code);
    if (existing !== null) throw produitCodeAlreadyExists(produit.code);

    const persisted = await this.produitRepository.save(produit);
    return toDTO(persisted);
  }
}
