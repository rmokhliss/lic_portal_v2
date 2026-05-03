// ==============================================================================
// LIC v2 — Erreurs typées du module entite (Phase 4 étape 4.C)
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function entiteNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-730",
    message: `Entité introuvable : "${id}"`,
    details: { id },
  });
}

export function entiteNomAlreadyExists(clientId: string, nom: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-731",
    message: `Une entité avec le nom "${nom}" existe déjà pour ce client`,
    details: { clientId, nom },
  });
}
