// ==============================================================================
// LIC v2 — CreatePaysUseCase (Phase 2.B étape 3/7)
//
// Spécificité : si regionCode fourni mais inexistant en BD, la contrainte FK
// `lic_pays_ref_region_code_lic_regions_ref_region_code_fk` lève une erreur
// PG 23503. Pas de pré-check (cross-module forbidden, cf. R-29) — l'erreur
// remonte tel quel. La UI Phase 2.B étape 7 utilise un dropdown des régions
// existantes, donc le cas devrait être impossible côté UI.
// ==============================================================================

import { toDTO, type PaysDTO } from "../adapters/postgres/pays.mapper";
import { Pays, type CreatePaysInput as DomainCreateInput } from "../domain/pays.entity";
import { paysCodeAlreadyExists } from "../domain/pays.errors";
import type { PaysRepository } from "../ports/pays.repository";

export type CreatePaysUseCaseInput = DomainCreateInput;

export class CreatePaysUseCase {
  constructor(private readonly paysRepository: PaysRepository) {}

  async execute(input: CreatePaysUseCaseInput): Promise<PaysDTO> {
    const pays = Pays.create(input);
    const existing = await this.paysRepository.findByCode(pays.codePays);
    if (existing !== null) {
      throw paysCodeAlreadyExists(pays.codePays);
    }
    const persisted = await this.paysRepository.save(pays);
    return toDTO(persisted);
  }
}
