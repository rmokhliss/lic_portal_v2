// ==============================================================================
// LIC v2 — Erreurs typées du module regions (Phase 2.B étape 2/7)
//
// Helpers fins qui figent les codes SPX-LIC-NNN du module + un message
// contextualisé. Les use-cases throw ces erreurs ; les Server Actions
// (Phase 2.B étape 7) les attrapent via isAppError() pour mapper en HTTP.
//
// Catalogue (range 700-799 : settings + utilisateurs + référentiels) :
//   - SPX-LIC-700 : RegionNotFoundError      (NotFoundError 404)
//   - SPX-LIC-701 : RegionCodeAlreadyExists  (ConflictError 409)
//   - SPX-LIC-702 : Validation (centralisée dans region.entity.ts)
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

/** Aucune région avec ce code en BD. */
export function regionNotFoundByCode(regionCode: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-700",
    message: `Région introuvable : "${regionCode}"`,
    details: { regionCode },
  });
}

/** Tentative d'INSERT alors qu'une région avec ce code existe déjà. */
export function regionCodeAlreadyExists(regionCode: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-701",
    message: `Une région avec le code "${regionCode}" existe déjà`,
    details: { regionCode },
  });
}
