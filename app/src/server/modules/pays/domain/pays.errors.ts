// ==============================================================================
// LIC v2 — Erreurs typées du module pays (Phase 2.B étape 3/7)
//
// Range 700-799 : SPX-LIC-703/704/705 (cf. shared/error-codes).
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function paysNotFoundByCode(codePays: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-703",
    message: `Pays introuvable : "${codePays}"`,
    details: { codePays },
  });
}

export function paysCodeAlreadyExists(codePays: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-704",
    message: `Un pays avec le code "${codePays}" existe déjà`,
    details: { codePays },
  });
}
