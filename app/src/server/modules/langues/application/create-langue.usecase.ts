// ==============================================================================
// LIC v2 — CreateLangueUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type LangueDTO } from "../adapters/postgres/langue.mapper";
import { Langue, type CreateLangueInput as DomainCreateInput } from "../domain/langue.entity";
import { langueCodeAlreadyExists } from "../domain/langue.errors";
import type { LangueRepository } from "../ports/langue.repository";

export type CreateLangueUseCaseInput = DomainCreateInput;

export class CreateLangueUseCase {
  constructor(private readonly langueRepository: LangueRepository) {}

  async execute(input: CreateLangueUseCaseInput): Promise<LangueDTO> {
    const langue = Langue.create(input);
    const existing = await this.langueRepository.findByCode(langue.codeLangue);
    if (existing !== null) {
      throw langueCodeAlreadyExists(langue.codeLangue);
    }
    const persisted = await this.langueRepository.save(langue);
    return toDTO(persisted);
  }
}
