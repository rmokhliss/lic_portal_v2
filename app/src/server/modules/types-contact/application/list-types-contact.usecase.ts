// ==============================================================================
// LIC v2 — ListTypesContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type TypeContactDTO } from "../adapters/postgres/type-contact.mapper";
import type {
  FindAllTypesContactOptions,
  TypeContactRepository,
} from "../ports/type-contact.repository";

export type ListTypesContactInput = FindAllTypesContactOptions;

export class ListTypesContactUseCase {
  constructor(private readonly typeContactRepository: TypeContactRepository) {}

  async execute(input: ListTypesContactInput = {}): Promise<readonly TypeContactDTO[]> {
    const all = await this.typeContactRepository.findAll(input);
    return all.map(toDTO);
  }
}
