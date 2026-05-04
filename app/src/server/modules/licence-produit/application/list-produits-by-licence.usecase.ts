// ==============================================================================
// LIC v2 — ListProduitsByLicenceUseCase (Phase 6 étape 6.C)
// Read-only, pas d'audit. Retourne les liaisons + le DTO produit dénormalisé.
// ==============================================================================

import type { ProduitDTO } from "@/server/modules/produit/adapters/postgres/produit.mapper";
import { toDTO as produitToDTO } from "@/server/modules/produit/adapters/postgres/produit.mapper";
import type { ProduitRepository } from "@/server/modules/produit/ports/produit.repository";

import { toDTO, type LicenceProduitDTO } from "../adapters/postgres/licence-produit.mapper";
import type { LicenceProduitRepository } from "../ports/licence-produit.repository";

export interface LicenceProduitWithProduitDTO {
  readonly liaison: LicenceProduitDTO;
  readonly produit: ProduitDTO | null;
}

export class ListProduitsByLicenceUseCase {
  constructor(
    private readonly licenceProduitRepository: LicenceProduitRepository,
    private readonly produitRepository: ProduitRepository,
  ) {}

  async execute(licenceId: string): Promise<readonly LicenceProduitWithProduitDTO[]> {
    const liaisons = await this.licenceProduitRepository.findByLicence(licenceId);
    const result: LicenceProduitWithProduitDTO[] = [];
    for (const liaison of liaisons) {
      const produit = await this.produitRepository.findById(liaison.produitId);
      result.push({
        liaison: toDTO(liaison),
        produit: produit === null ? null : produitToDTO(produit),
      });
    }
    return result;
  }
}
