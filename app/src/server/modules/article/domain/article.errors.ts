// ==============================================================================
// LIC v2 — Erreurs typées du module article (Phase 6 étape 6.B)
//
// Codes : SPX-LIC-746 NotFound, 747 Conflict (par produit), 748 Validation.
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function articleNotFoundById(id: number): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-746",
    message: `Article introuvable : id=${String(id)}`,
    details: { id },
  });
}

export function articleNotFoundByProduitCode(produitId: number, code: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-746",
    message: `Article introuvable : produitId=${String(produitId)} code="${code}"`,
    details: { produitId, code },
  });
}

export function articleCodeAlreadyExists(produitId: number, code: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-747",
    message: `Un article avec le code "${code}" existe déjà pour le produit ${String(produitId)}`,
    details: { produitId, code },
  });
}
