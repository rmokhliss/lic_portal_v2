// ==============================================================================
// LIC v2 — UpdateRegionUseCase (Phase 2.B étape 2/7)
//
// Patch partiel : nom et dmResponsable. regionCode immuable (FK target stable
// ADR 0017). actif n'est pas géré ici → ToggleRegionUseCase.
//
// Convention pour dmResponsable :
//   - absent (undefined) : aucune modification
//   - null               : effacer la valeur
//   - string             : définir/remplacer
//
// Pas d'audit, pas de db.transaction interne (cf. ADR 0017 + R-27 — refs
// paramétrables hors règle audit obligatoire).
// ==============================================================================

import { toDTO, type RegionDTO } from "../adapters/postgres/region.mapper";
import { regionNotFoundByCode } from "../domain/region.errors";
import type { RegionRepository } from "../ports/region.repository";

export interface UpdateRegionUseCaseInput {
  /** Selector — quelle région éditer. Immuable. */
  readonly regionCode: string;
  /** Nouveau libellé. Absent = inchangé. */
  readonly nom?: string;
  /** Nouveau DM. `null` = effacer, `undefined` = inchangé, string = remplacer. */
  readonly dmResponsable?: string | null;
}

export class UpdateRegionUseCase {
  constructor(private readonly regionRepository: RegionRepository) {}

  async execute(input: UpdateRegionUseCaseInput): Promise<RegionDTO> {
    const existing = await this.regionRepository.findByCode(input.regionCode);
    if (existing === null) {
      throw regionNotFoundByCode(input.regionCode);
    }

    let updated = existing;
    if (input.nom !== undefined) {
      updated = updated.withName(input.nom);
    }
    // Distinction undefined (no-op) vs null (clear) — `in` opérateur exact.
    if ("dmResponsable" in input) {
      updated = updated.withDmResponsable(input.dmResponsable);
    }

    await this.regionRepository.update(updated);
    return toDTO(updated);
  }
}
