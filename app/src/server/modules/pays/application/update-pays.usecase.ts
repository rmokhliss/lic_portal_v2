// ==============================================================================
// LIC v2 — UpdatePaysUseCase (Phase 2.B étape 3/7)
//
// Patch partiel : nom et regionCode. codePays immuable (ISO stable).
// regionCode :
//   - undefined : inchangé
//   - null      : effacer la valeur (pays sans région rattachée)
//   - string    : remplacer (FK vérifiée par BD à l'UPDATE → 23503 si invalide)
// ==============================================================================

import { toDTO, type PaysDTO } from "../adapters/postgres/pays.mapper";
import { paysNotFoundByCode } from "../domain/pays.errors";
import type { PaysRepository } from "../ports/pays.repository";

export interface UpdatePaysUseCaseInput {
  readonly codePays: string;
  readonly nom?: string;
  readonly regionCode?: string | null;
}

export class UpdatePaysUseCase {
  constructor(private readonly paysRepository: PaysRepository) {}

  async execute(input: UpdatePaysUseCaseInput): Promise<PaysDTO> {
    const existing = await this.paysRepository.findByCode(input.codePays);
    if (existing === null) {
      throw paysNotFoundByCode(input.codePays);
    }

    let updated = existing;
    if (input.nom !== undefined) {
      updated = updated.withName(input.nom);
    }
    if ("regionCode" in input) {
      updated = updated.withRegionCode(input.regionCode);
    }

    await this.paysRepository.update(updated);
    return toDTO(updated);
  }
}
