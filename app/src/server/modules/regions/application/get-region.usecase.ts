// ==============================================================================
// LIC v2 — GetRegionUseCase (Phase 2.B étape 2/7)
//
// Lookup unitaire par regionCode. Throw NotFoundError SPX-LIC-700 si absent
// (vs ListRegionsUseCase qui retourne []).
//
// Validation préalable du format de regionCode : si l'input est manifestement
// invalide (chaîne vide, > 50 chars), throw ValidationError SPX-LIC-702 sans
// requête BD. Évite de polluer les logs avec des "404" pour des inputs
// malformés évidents.
// ==============================================================================

import { Region } from "../domain/region.entity";
import { regionNotFoundByCode } from "../domain/region.errors";
import { toDTO, type RegionDTO } from "../adapters/postgres/region.mapper";
import type { RegionRepository } from "../ports/region.repository";

export class GetRegionUseCase {
  constructor(private readonly regionRepository: RegionRepository) {}

  async execute(regionCode: string): Promise<RegionDTO> {
    Region.validateRegionCode(regionCode);
    const region = await this.regionRepository.findByCode(regionCode);
    if (region === null) {
      throw regionNotFoundByCode(regionCode);
    }
    return toDTO(region);
  }
}
