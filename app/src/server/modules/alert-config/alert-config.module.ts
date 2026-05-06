// ==============================================================================
// LIC v2 — Composition root alert-config (Phase 8.B)
// Read-only ici, mutateurs dans composition-root.ts (audit obligatoire).
// ==============================================================================

import { AlertConfigRepositoryPg } from "./adapters/postgres/alert-config.repository.pg";
import { ListAlertConfigsByClientUseCase } from "./application/list-alert-configs-by-client.usecase";
import { ListAllAlertConfigsUseCase } from "./application/list-all-alert-configs.usecase";
import type { AlertConfigRepository } from "./ports/alert-config.repository";

export const alertConfigRepository: AlertConfigRepository = new AlertConfigRepositoryPg();

export const listAlertConfigsByClientUseCase = new ListAlertConfigsByClientUseCase(
  alertConfigRepository,
);
export const listAllAlertConfigsUseCase = new ListAllAlertConfigsUseCase(alertConfigRepository);
