// ==============================================================================
// LIC v2 — Erreurs typées du module volume-history (Phase 6 étape 6.D)
// SPX-LIC-754 : snapshot déjà enregistré (UNIQUE licence+article+periode).
// ==============================================================================

import { ConflictError } from "@/server/modules/error";

export function snapshotAlreadyExists(
  licenceId: string,
  articleId: number,
  periode: Date,
): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-754",
    message: `Snapshot déjà enregistré pour licence=${licenceId} article=${String(articleId)} periode=${periode.toISOString().slice(0, 10)}`,
    details: {
      licenceId,
      articleId,
      periode: periode.toISOString().slice(0, 10),
    },
  });
}
