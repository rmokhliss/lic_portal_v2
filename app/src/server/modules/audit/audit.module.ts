// ==============================================================================
// LIC v2 — Composition root du module audit (intra-module DI uniquement) — F-08
//
// Exporte le singleton auditRepository destiné à être consommé EXCLUSIVEMENT
// par app/src/server/composition-root.ts pour câbler les use-cases cross-module.
// ==============================================================================

import { AuditRepositoryPg } from "./adapters/postgres/audit.repository.pg";
import type { AuditRepository } from "./ports/audit.repository";

export const auditRepository: AuditRepository = new AuditRepositoryPg();
