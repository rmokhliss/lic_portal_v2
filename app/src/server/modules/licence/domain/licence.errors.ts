// ==============================================================================
// LIC v2 — Erreurs typées du module licence (Phase 5)
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

import type { LicenceStatus } from "./licence.entity";

export function licenceNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-735",
    message: `Licence introuvable : "${id}"`,
    details: { id },
  });
}

export function licenceReferenceAlreadyExists(reference: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-736",
    message: `Une licence avec la référence "${reference}" existe déjà`,
    details: { reference },
  });
}

export function licenceStatusTransitionForbidden(
  from: LicenceStatus,
  to: LicenceStatus,
): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-738",
    message: `Transition de statut licence interdite : ${from} → ${to}`,
    details: { from, to },
  });
}

export function licenceVersionConflict(
  expectedVersion: number,
  actualVersion: number,
): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-739",
    message: `Conflit de version licence : attendu ${String(expectedVersion)}, BD ${String(actualVersion)}`,
    details: { expectedVersion, actualVersion },
  });
}
