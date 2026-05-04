// ==============================================================================
// LIC v2 — Erreurs typées du module licence-produit (Phase 6 étape 6.C)
// SPX-LIC-749 NotFound, 750 Conflict (déjà attaché).
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function licenceProduitNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-749",
    message: `Liaison licence-produit introuvable : id=${id}`,
    details: { id },
  });
}

export function licenceProduitAlreadyAttached(licenceId: string, produitId: number): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-750",
    message: `Le produit ${String(produitId)} est déjà attaché à la licence ${licenceId}`,
    details: { licenceId, produitId },
  });
}
