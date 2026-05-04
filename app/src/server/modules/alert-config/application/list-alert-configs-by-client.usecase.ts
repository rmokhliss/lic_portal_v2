// ==============================================================================
// LIC v2 — ListAlertConfigsByClientUseCase (Phase 8.B) — read-only.
// ==============================================================================

import { toDTO, type AlertConfigDTO } from "../adapters/postgres/alert-config.mapper";
import type { AlertConfigRepository } from "../ports/alert-config.repository";

export class ListAlertConfigsByClientUseCase {
  constructor(private readonly alertConfigRepository: AlertConfigRepository) {}

  async execute(clientId: string): Promise<readonly AlertConfigDTO[]> {
    const configs = await this.alertConfigRepository.findByClient(clientId);
    return configs.map(toDTO);
  }
}
