// ==============================================================================
// LIC v2 — GetLangueUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type LangueDTO } from "../adapters/postgres/langue.mapper";
import { Langue } from "../domain/langue.entity";
import { langueNotFoundByCode } from "../domain/langue.errors";
import type { LangueRepository } from "../ports/langue.repository";

export class GetLangueUseCase {
  constructor(private readonly langueRepository: LangueRepository) {}

  async execute(codeLangue: string): Promise<LangueDTO> {
    Langue.validateCodeLangue(codeLangue);
    const langue = await this.langueRepository.findByCode(codeLangue);
    if (langue === null) {
      throw langueNotFoundByCode(codeLangue);
    }
    return toDTO(langue);
  }
}
