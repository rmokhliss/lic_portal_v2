// ==============================================================================
// LIC v2 — ToggleRegionUseCase (Phase 2.B étape 2/7)
//
// Bascule actif ↔ inactif. Pas de delete BD : soft-disable cohérent avec la
// règle L5 et la nature paramétrable du référentiel (les régions inactives
// restent en BD pour l'historique des FK pays/team-members).
//
// Pas d'audit, pas de db.transaction interne (cf. ADR 0017 + R-27).
// ==============================================================================

import { toDTO, type RegionDTO } from "../adapters/postgres/region.mapper";
import { regionNotFoundByCode } from "../domain/region.errors";
import type { RegionRepository } from "../ports/region.repository";

export class ToggleRegionUseCase {
  constructor(private readonly regionRepository: RegionRepository) {}

  async execute(regionCode: string): Promise<RegionDTO> {
    const existing = await this.regionRepository.findByCode(regionCode);
    if (existing === null) {
      throw regionNotFoundByCode(regionCode);
    }

    const toggled = existing.toggle();
    await this.regionRepository.update(toggled);
    return toDTO(toggled);
  }
}
