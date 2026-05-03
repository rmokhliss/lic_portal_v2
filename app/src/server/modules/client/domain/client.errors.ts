// ==============================================================================
// LIC v2 — Erreurs typées du module client (Phase 4 étape 4.B)
//
// Catalogue (range 724-729 EC-Clients) :
//   - SPX-LIC-724 : ClientNotFound                  (NotFoundError 404)
//   - SPX-LIC-725 : ClientCodeAlreadyExists         (ConflictError 409)
//   - SPX-LIC-726 : Validation (centralisée dans client.entity.ts)
//   - SPX-LIC-727 : ClientStatusTransitionForbidden (ConflictError 409)
//   - SPX-LIC-728 : ClientVersionConflict (L4)      (ConflictError 409)
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

import type { ClientStatut } from "./client.entity";

export function clientNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-724",
    message: `Client introuvable : "${id}"`,
    details: { id },
  });
}

export function clientCodeAlreadyExists(codeClient: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-725",
    message: `Un client avec le code "${codeClient}" existe déjà`,
    details: { codeClient },
  });
}

export function clientStatusTransitionForbidden(
  from: ClientStatut,
  to: ClientStatut,
): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-727",
    message: `Transition de statut interdite : ${from} → ${to}`,
    details: { from, to },
  });
}

export function clientVersionConflict(
  expectedVersion: number,
  actualVersion: number,
): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-728",
    message: `Conflit de version client : attendu ${String(expectedVersion)}, BD ${String(actualVersion)} (modification concurrente)`,
    details: { expectedVersion, actualVersion },
  });
}
