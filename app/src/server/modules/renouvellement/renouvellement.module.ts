// ==============================================================================
// LIC v2 — Composition root du module renouvellement (Phase 5)
// Read-only. Mutateurs câblés dans composition-root.ts (audit + user + licence).
// ==============================================================================

import { RenouvellementRepositoryPg } from "./adapters/postgres/renouvellement.repository.pg";
import { GetRenouvellementUseCase } from "./application/get-renouvellement.usecase";
import { ListRenouvellementsByLicenceUseCase } from "./application/list-renouvellements-by-licence.usecase";
import type { RenouvellementRepository } from "./ports/renouvellement.repository";

export const renouvellementRepository: RenouvellementRepository = new RenouvellementRepositoryPg();

export const getRenouvellementUseCase = new GetRenouvellementUseCase(renouvellementRepository);
export const listRenouvellementsByLicenceUseCase = new ListRenouvellementsByLicenceUseCase(
  renouvellementRepository,
);
