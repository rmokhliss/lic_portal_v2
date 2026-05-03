// ==============================================================================
// LIC v2 — UpdateTypeContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type TypeContactDTO } from "../adapters/postgres/type-contact.mapper";
import { typeContactNotFoundByCode } from "../domain/type-contact.errors";
import type { TypeContactRepository } from "../ports/type-contact.repository";

export interface UpdateTypeContactUseCaseInput {
  readonly code: string;
  readonly libelle?: string;
}

export class UpdateTypeContactUseCase {
  constructor(private readonly typeContactRepository: TypeContactRepository) {}

  async execute(input: UpdateTypeContactUseCaseInput): Promise<TypeContactDTO> {
    const existing = await this.typeContactRepository.findByCode(input.code);
    if (existing === null) {
      throw typeContactNotFoundByCode(input.code);
    }

    let updated = existing;
    if (input.libelle !== undefined) {
      updated = updated.withLibelle(input.libelle);
    }

    await this.typeContactRepository.update(updated);
    return toDTO(updated);
  }
}
