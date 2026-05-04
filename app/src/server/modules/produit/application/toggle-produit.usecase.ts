// ==============================================================================
// LIC v2 — ToggleProduitUseCase (Phase 6 étape 6.B)
// Soft-disable cohérent règle L5 — un produit inactif n'apparaît plus
// dans le sélecteur AddProduitDialog mais reste lisible pour les licences existantes.
// ==============================================================================

import { toDTO, type ProduitDTO } from "../adapters/postgres/produit.mapper";
import { produitNotFoundByCode } from "../domain/produit.errors";
import type { ProduitRepository } from "../ports/produit.repository";

export class ToggleProduitUseCase {
  constructor(private readonly produitRepository: ProduitRepository) {}

  async execute(code: string): Promise<ProduitDTO> {
    const existing = await this.produitRepository.findByCode(code);
    if (existing === null) throw produitNotFoundByCode(code);

    const toggled = existing.toggle();
    await this.produitRepository.update(toggled);
    return toDTO(toggled);
  }
}
