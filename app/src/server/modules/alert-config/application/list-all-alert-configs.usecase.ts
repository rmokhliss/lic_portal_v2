// ==============================================================================
// LIC v2 — ListAllAlertConfigsUseCase (Phase 17 S4) — read-only, cross-clients.
// ==============================================================================

import { toDTO, type AlertConfigDTO } from "../adapters/postgres/alert-config.mapper";
import type { AlertConfigRepository } from "../ports/alert-config.repository";

export class ListAllAlertConfigsUseCase {
  constructor(private readonly alertConfigRepository: AlertConfigRepository) {}

  async execute(): Promise<readonly AlertConfigDTO[]> {
    const configs = await this.alertConfigRepository.findAll();
    return configs.map(toDTO);
  }
}
