// ==============================================================================
// LIC v2 — Erreurs typées du module types-contact (Phase 2.B étape 3/7)
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function typeContactNotFoundByCode(code: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-712",
    message: `Type de contact introuvable : "${code}"`,
    details: { code },
  });
}

export function typeContactCodeAlreadyExists(code: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-713",
    message: `Un type de contact avec le code "${code}" existe déjà`,
    details: { code },
  });
}
