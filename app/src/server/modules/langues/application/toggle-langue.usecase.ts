// ==============================================================================
// LIC v2 — ToggleLangueUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { toDTO, type LangueDTO } from "../adapters/postgres/langue.mapper";
import { langueNotFoundByCode } from "../domain/langue.errors";
import type { LangueRepository } from "../ports/langue.repository";

export class ToggleLangueUseCase {
  constructor(private readonly langueRepository: LangueRepository) {}

  async execute(codeLangue: string): Promise<LangueDTO> {
    const existing = await this.langueRepository.findByCode(codeLangue);
    if (existing === null) {
      throw langueNotFoundByCode(codeLangue);
    }
    const toggled = existing.toggle();
    await this.langueRepository.update(toggled);
    return toDTO(toggled);
  }
}
