// ==============================================================================
// LIC v2 — ListRegionsUseCase (Phase 2.B étape 2/7)
//
// Read-only : pas d'audit, pas de transaction. Use-case standalone exposé par
// regions.module.ts (n'a pas besoin d'AuditRepository → pas de cross-module DI
// donc pas de passage par composition-root).
//
// Tri stable par regionCode ASC (côté repo). Filtre `actif` optionnel pour
// l'écran /settings (toggle "afficher les inactives").
// ==============================================================================

import { toDTO, type RegionDTO } from "../adapters/postgres/region.mapper";
import type { FindAllRegionsOptions, RegionRepository } from "../ports/region.repository";

export type ListRegionsInput = FindAllRegionsOptions;

export class ListRegionsUseCase {
  constructor(private readonly regionRepository: RegionRepository) {}

  async execute(input: ListRegionsInput = {}): Promise<readonly RegionDTO[]> {
    const regions = await this.regionRepository.findAll(input);
    return regions.map(toDTO);
  }
}
