// ==============================================================================
// LIC v2 — Helper cursor pagination réutilisable (Référentiel §4.15) — F-08
//
// Format : base64url(`<ISO8601>|<UUID>`)
// Le séparateur '|' n'est PAS dans l'alphabet base64url (A-Z, a-z, 0-9, '-', '_'),
// donc aucune collision possible dans le payload chiffré.
//
// ⚠️ Cursor non signé : falsification → SPX-LIC-502 propre.
//    Si usage public futur (UI tierce, API publique) : ADR + HMAC SHA-256.
//
// ⚠️ Node-only : Buffer requis (encode/decode base64url). Tout
//    infrastructure/db/ est server-only par construction (postgres.js).
//    Migration Edge si requis : TextEncoder + btoa + replace +→- /→_ + strip =.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

/** Encode un cursor de pagination cursor-based à partir d'un timestamp UTC
 *  et d'un identifiant UUID (tie-breaker stable pour ORDER BY (created_at DESC,
 *  id DESC)). */
export function encodeCursor(timestamp: Date, id: string): string {
  const payload = `${timestamp.toISOString()}|${id}`;
  return Buffer.from(payload, "utf8").toString("base64url");
}

/** Décode un cursor produit par `encodeCursor`. Retourne timestamp + id.
 *
 *  Throw `ValidationError SPX-LIC-502` si :
 *  - cursor n'est pas un base64url valide (alphabet, padding)
 *  - payload décodé n'a pas le format `<ISO8601>|<UUID>`
 *  - timestamp n'est pas parsable en Date valide
 *  - uuid n'est pas un UUID valide */
export function decodeCursor(cursor: string): { timestamp: Date; id: string } {
  if (!BASE64URL_REGEX.test(cursor)) {
    throw new ValidationError({ code: "SPX-LIC-502" });
  }

  let payload: string;
  try {
    payload = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw new ValidationError({ code: "SPX-LIC-502" });
  }

  const sepIdx = payload.indexOf("|");
  if (sepIdx === -1) {
    throw new ValidationError({ code: "SPX-LIC-502" });
  }

  const isoPart = payload.slice(0, sepIdx);
  const idPart = payload.slice(sepIdx + 1);

  const timestamp = new Date(isoPart);
  if (Number.isNaN(timestamp.getTime())) {
    throw new ValidationError({ code: "SPX-LIC-502" });
  }

  if (!UUID_REGEX.test(idPart)) {
    throw new ValidationError({ code: "SPX-LIC-502" });
  }

  return { timestamp, id: idPart };
}
