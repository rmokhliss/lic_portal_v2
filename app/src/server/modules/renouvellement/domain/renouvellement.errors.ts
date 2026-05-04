// ==============================================================================
// LIC v2 — Erreurs typées du module renouvellement (Phase 5)
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

import type { RenewStatus } from "./renouvellement.entity";

export function renouvellementNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-740",
    message: `Renouvellement introuvable : "${id}"`,
    details: { id },
  });
}

export function renouvellementStatusTransitionForbidden(
  from: RenewStatus,
  to: RenewStatus,
): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-742",
    message: `Transition de statut renouvellement interdite : ${from} → ${to}`,
    details: { from, to },
  });
}
