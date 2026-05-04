// ==============================================================================
// LIC v2 — Erreurs typées du module produit (Phase 6 étape 6.B)
//
// Codes (range 743-745) :
//   - SPX-LIC-743 : ProduitNotFoundError
//   - SPX-LIC-744 : ProduitCodeAlreadyExists
//   - SPX-LIC-745 : Validation (centralisée dans produit.entity.ts)
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function produitNotFoundByCode(code: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-743",
    message: `Produit introuvable : "${code}"`,
    details: { code },
  });
}

export function produitNotFoundById(id: number): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-743",
    message: `Produit introuvable : id=${String(id)}`,
    details: { id },
  });
}

export function produitCodeAlreadyExists(code: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-744",
    message: `Un produit avec le code "${code}" existe déjà`,
    details: { code },
  });
}
