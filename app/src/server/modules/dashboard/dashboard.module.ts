// ==============================================================================
// LIC v2 — Composition root du module dashboard (Phase 11.A + 11.B)
//
// Read-only, pas d'audit. Phase 11.B exports CSV cross-module : ExportLicences
// nécessite le LicenceRepository, ExportRenouvellements le RenouvellementRepository
// → câblés dans composition-root.ts global, pas ici.
// ==============================================================================

import { DashboardRepositoryPg } from "./adapters/postgres/dashboard.repository.pg";
import { GetDashboardStatsUseCase } from "./application/get-dashboard-stats.usecase";
import type { DashboardRepository } from "./ports/dashboard.repository";

export const dashboardRepository: DashboardRepository = new DashboardRepositoryPg();

export const getDashboardStatsUseCase = new GetDashboardStatsUseCase(dashboardRepository);
