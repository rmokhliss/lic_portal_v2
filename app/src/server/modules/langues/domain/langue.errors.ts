// ==============================================================================
// LIC v2 — Erreurs typées du module langues (Phase 2.B étape 3/7)
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function langueNotFoundByCode(codeLangue: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-709",
    message: `Langue introuvable : "${codeLangue}"`,
    details: { codeLangue },
  });
}

export function langueCodeAlreadyExists(codeLangue: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-710",
    message: `Une langue avec le code "${codeLangue}" existe déjà`,
    details: { codeLangue },
  });
}
