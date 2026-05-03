// ==============================================================================
// LIC v2 — Erreurs typées du module devises (Phase 2.B étape 3/7)
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function deviseNotFoundByCode(codeDevise: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-706",
    message: `Devise introuvable : "${codeDevise}"`,
    details: { codeDevise },
  });
}

export function deviseCodeAlreadyExists(codeDevise: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-707",
    message: `Une devise avec le code "${codeDevise}" existe déjà`,
    details: { codeDevise },
  });
}
