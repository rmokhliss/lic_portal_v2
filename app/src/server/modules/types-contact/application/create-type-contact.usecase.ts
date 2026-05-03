// ==============================================================================
// LIC v2 — CreateTypeContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type TypeContactDTO } from "../adapters/postgres/type-contact.mapper";
import {
  TypeContact,
  type CreateTypeContactInput as DomainCreateInput,
} from "../domain/type-contact.entity";
import { typeContactCodeAlreadyExists } from "../domain/type-contact.errors";
import type { TypeContactRepository } from "../ports/type-contact.repository";

export type CreateTypeContactUseCaseInput = DomainCreateInput;

export class CreateTypeContactUseCase {
  constructor(private readonly typeContactRepository: TypeContactRepository) {}

  async execute(input: CreateTypeContactUseCaseInput): Promise<TypeContactDTO> {
    const tc = TypeContact.create(input);
    const existing = await this.typeContactRepository.findByCode(tc.code);
    if (existing !== null) {
      throw typeContactCodeAlreadyExists(tc.code);
    }
    const persisted = await this.typeContactRepository.save(tc);
    return toDTO(persisted);
  }
}
