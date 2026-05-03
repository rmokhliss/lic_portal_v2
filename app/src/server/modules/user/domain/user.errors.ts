// ==============================================================================
// LIC v2 — Erreurs typées du module user (Phase 2.B.bis EC-08)
//
// Catalogue (range 720-729 utilisateurs back-office) :
//   - SPX-LIC-720 : UserNotFound           (NotFoundError 404)
//   - SPX-LIC-721 : UserConflict (matricule/email) (ConflictError 409)
//   - SPX-LIC-722 : Validation (centralisée dans user.entity.ts)
//   - SPX-LIC-723 : SelfDeactivationForbidden (ConflictError 409)
//
// Codes 0xx (auth) restent utilisés par change-password.usecase.ts existant.
// ==============================================================================

import { ConflictError, NotFoundError } from "@/server/modules/error";

export function userNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-720",
    message: `Utilisateur introuvable : "${id}"`,
    details: { id },
  });
}

export function matriculeAlreadyExists(matricule: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-721",
    message: `Le matricule "${matricule}" est déjà utilisé`,
    details: { matricule, conflictField: "matricule" },
  });
}

export function emailAlreadyExists(email: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-721",
    message: `L'email "${email}" est déjà utilisé`,
    details: { email, conflictField: "email" },
  });
}

export function selfDeactivationForbidden(actorId: string): ConflictError {
  return new ConflictError({
    code: "SPX-LIC-723",
    message: "Un administrateur ne peut pas se désactiver lui-même",
    details: { actorId },
  });
}
