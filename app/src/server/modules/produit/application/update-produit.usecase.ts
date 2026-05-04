// ==============================================================================
// LIC v2 — UpdateProduitUseCase (Phase 6 étape 6.B)
//
// Patch partiel : nom + description. code immuable (FK target). actif via toggle.
// ==============================================================================

import { toDTO, type ProduitDTO } from "../adapters/postgres/produit.mapper";
import { produitNotFoundByCode } from "../domain/produit.errors";
import type { ProduitRepository } from "../ports/produit.repository";

export interface UpdateProduitUseCaseInput {
  readonly code: string;
  readonly nom?: string;
  readonly description?: string | null;
}

export class UpdateProduitUseCase {
  constructor(private readonly produitRepository: ProduitRepository) {}

  async execute(input: UpdateProduitUseCaseInput): Promise<ProduitDTO> {
    const existing = await this.produitRepository.findByCode(input.code);
    if (existing === null) throw produitNotFoundByCode(input.code);

    let updated = existing;
    if (input.nom !== undefined) updated = updated.withName(input.nom);
    if ("description" in input) updated = updated.withDescription(input.description);

    await this.produitRepository.update(updated);
    return toDTO(updated);
  }
}
