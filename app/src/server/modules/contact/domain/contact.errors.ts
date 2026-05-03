// ==============================================================================
// LIC v2 — Erreurs typées du module contact (Phase 4 étape 4.C)
// ==============================================================================

import { NotFoundError } from "@/server/modules/error";

export function contactNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-733",
    message: `Contact introuvable : "${id}"`,
    details: { id },
  });
}
