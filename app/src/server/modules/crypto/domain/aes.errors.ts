// ==============================================================================
// LIC v2 — Erreurs typées AES-256-GCM (Phase 3.A.2)
//
//   SPX-LIC-402 — Tag d'authentification invalide ou format chiffré altéré
//   SPX-LIC-403 — Clé AES-256 invalide (longueur ≠ 32 octets ou non base64)
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export function aesGcmTagMismatch(reason: string): ValidationError {
  return new ValidationError({
    code: "SPX-LIC-402",
    message: `Échec déchiffrement AES-GCM : ${reason}`,
    details: { reason },
  });
}

export function aesKeyInvalid(reason: string): ValidationError {
  return new ValidationError({
    code: "SPX-LIC-403",
    message: `Clé AES-256 invalide : ${reason}`,
    details: { reason },
  });
}
