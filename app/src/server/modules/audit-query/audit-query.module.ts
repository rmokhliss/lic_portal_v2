// ==============================================================================
// LIC v2 — Composition root du module audit-query (Phase 7 étape 7.A)
//
// Lecture seule. Pas d'audit. Read-only n'a pas besoin de cross-module DI →
// tous les use-cases sont câblés ici directement (pas dans composition-root.ts).
// ==============================================================================

import { AuditQueryRepositoryPg } from "./adapters/postgres/audit-query.repository.pg";
import { ExportAuditCsvUseCase } from "./application/export-audit-csv.usecase";
import { ListAuditByClientScopeUseCase } from "./application/list-audit-by-client-scope.usecase";
import { ListAuditByEntityUseCase } from "./application/list-audit-by-entity.usecase";
import { ListAuditByLicenceScopeUseCase } from "./application/list-audit-by-licence-scope.usecase";
import { SearchAuditUseCase } from "./application/search-audit.usecase";
import type { AuditQueryRepository } from "./ports/audit-query.repository";

export const auditQueryRepository: AuditQueryRepository = new AuditQueryRepositoryPg();

export const listAuditByEntityUseCase = new ListAuditByEntityUseCase(auditQueryRepository);
export const listAuditByClientScopeUseCase = new ListAuditByClientScopeUseCase(
  auditQueryRepository,
);
export const listAuditByLicenceScopeUseCase = new ListAuditByLicenceScopeUseCase(
  auditQueryRepository,
);
export const searchAuditUseCase = new SearchAuditUseCase(auditQueryRepository);
export const exportAuditCsvUseCase = new ExportAuditCsvUseCase(auditQueryRepository);
