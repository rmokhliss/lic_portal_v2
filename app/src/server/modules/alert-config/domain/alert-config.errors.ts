// ==============================================================================
// LIC v2 — Erreurs alert-config (Phase 8.B)
// ==============================================================================

import { NotFoundError } from "@/server/modules/error";

export function alertConfigNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-756",
    message: `Configuration d'alerte introuvable : id=${id}`,
    details: { id },
  });
}
