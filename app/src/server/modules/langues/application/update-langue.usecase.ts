// ==============================================================================
// LIC v2 — UpdateLangueUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type LangueDTO } from "../adapters/postgres/langue.mapper";
import { langueNotFoundByCode } from "../domain/langue.errors";
import type { LangueRepository } from "../ports/langue.repository";

export interface UpdateLangueUseCaseInput {
  readonly codeLangue: string;
  readonly nom?: string;
}

export class UpdateLangueUseCase {
  constructor(private readonly langueRepository: LangueRepository) {}

  async execute(input: UpdateLangueUseCaseInput): Promise<LangueDTO> {
    const existing = await this.langueRepository.findByCode(input.codeLangue);
    if (existing === null) {
      throw langueNotFoundByCode(input.codeLangue);
    }

    let updated = existing;
    if (input.nom !== undefined) {
      updated = updated.withName(input.nom);
    }

    await this.langueRepository.update(updated);
    return toDTO(updated);
  }
}
