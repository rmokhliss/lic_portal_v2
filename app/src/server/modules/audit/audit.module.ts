// ==============================================================================
// LIC v2 — Composition root du module audit (intra-module DI uniquement)
//
// Exporte le singleton auditRecorder destiné à être consommé EXCLUSIVEMENT par
// app/src/server/composition-root.ts pour câbler les use-cases cross-module.
// Les Server Actions n'importent jamais ce module directement (cf. eslint
// boundaries strictes : app-route → composition-root uniquement).
// ==============================================================================

import { AuditRecorderPg } from "./adapters/postgres/audit.recorder.pg";
import type { AuditRecorder } from "./ports/audit.recorder";

export const auditRecorder: AuditRecorder = new AuditRecorderPg();
