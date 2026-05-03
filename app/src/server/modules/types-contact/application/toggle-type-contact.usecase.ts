// ==============================================================================
// LIC v2 — ToggleTypeContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type TypeContactDTO } from "../adapters/postgres/type-contact.mapper";
import { typeContactNotFoundByCode } from "../domain/type-contact.errors";
import type { TypeContactRepository } from "../ports/type-contact.repository";

export class ToggleTypeContactUseCase {
  constructor(private readonly typeContactRepository: TypeContactRepository) {}

  async execute(code: string): Promise<TypeContactDTO> {
    const existing = await this.typeContactRepository.findByCode(code);
    if (existing === null) {
      throw typeContactNotFoundByCode(code);
    }
    const toggled = existing.toggle();
    await this.typeContactRepository.update(toggled);
    return toDTO(toggled);
  }
}
