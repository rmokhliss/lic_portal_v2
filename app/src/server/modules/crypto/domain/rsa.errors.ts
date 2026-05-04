// ==============================================================================
// LIC v2 — Erreurs typées du module crypto / RSA (Phase 3.A.1)
//
// Codes alloués range crypto/PKI/sandbox (CLAUDE.md §4) :
//   SPX-LIC-400 — Signature RSA invalide (signature corrompue ou format base64
//                 illisible avant même la vérification cryptographique)
//   SPX-LIC-401 — Échec décodage clé RSA (PEM mal formé, clé absente, etc.)
//
// Convention identique aux autres modules : factories pures qui retournent une
// instance de la base ValidationError (cf. type-contact.errors.ts pour le
// pattern de référence).
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export function rsaSignatureInvalid(reason: string): ValidationError {
  return new ValidationError({
    code: "SPX-LIC-400",
    message: `Signature RSA invalide : ${reason}`,
    details: { reason },
  });
}

export function rsaKeyDecodingFailed(reason: string): ValidationError {
  return new ValidationError({
    code: "SPX-LIC-401",
    message: `Échec décodage clé RSA : ${reason}`,
    details: { reason },
  });
}
