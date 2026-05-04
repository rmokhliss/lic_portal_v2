// ==============================================================================
// LIC v2 — Erreurs typées X.509 (Phase 3.A.2)
//
// Codes couverts par le domaine 3.A.2 (les autres — 410/420/421/422 — sont
// alloués dans le catalogue mais utilisés en couches application 3.C-3.E) :
//
//   SPX-LIC-411 — CA absente ou clé privée CA invalide (ne décode pas en RSA)
//   SPX-LIC-422 — La clé privée fournie ne correspond pas au certificat CA
//                 (vérification de cohérence avant signature client)
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export function caAbsentOrInvalid(reason: string): ValidationError {
  return new ValidationError({
    code: "SPX-LIC-411",
    message: `CA S2M absente ou clé privée CA invalide : ${reason}`,
    details: { reason },
  });
}

export function caCertKeyMismatch(reason: string): ValidationError {
  return new ValidationError({
    code: "SPX-LIC-422",
    message: `CA cert et CA private key ne correspondent pas : ${reason}`,
    details: { reason },
  });
}
