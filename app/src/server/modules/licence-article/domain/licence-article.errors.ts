// ==============================================================================
// LIC v2 — Erreurs typées du module licence-article (Phase 6 étape 6.C)
// SPX-LIC-751 NotFound, 752 Conflict (déjà attaché), 753 VolumeValidation.
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function licenceArticleNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-751",
    message: `Liaison licence-article introuvable : id=${id}`,
    details: { id },
  });
}

export function licenceArticleAlreadyAttached(licenceId: string, articleId: number): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-752",
    message: `L'article ${String(articleId)} est déjà attaché à la licence ${licenceId}`,
    details: { licenceId, articleId },
  });
}
