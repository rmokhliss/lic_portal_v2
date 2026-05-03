// ==============================================================================
// LIC v2 — GetTypeContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type TypeContactDTO } from "../adapters/postgres/type-contact.mapper";
import { TypeContact } from "../domain/type-contact.entity";
import { typeContactNotFoundByCode } from "../domain/type-contact.errors";
import type { TypeContactRepository } from "../ports/type-contact.repository";

export class GetTypeContactUseCase {
  constructor(private readonly typeContactRepository: TypeContactRepository) {}

  async execute(code: string): Promise<TypeContactDTO> {
    TypeContact.validateCode(code);
    const tc = await this.typeContactRepository.findByCode(code);
    if (tc === null) {
      throw typeContactNotFoundByCode(code);
    }
    return toDTO(tc);
  }
}
