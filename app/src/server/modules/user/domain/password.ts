// ==============================================================================
// LIC v2 — Génération de mot de passe (Phase 2.B.bis EC-08)
//
// Pure function, pas de dépendance projet. Utilise node:crypto (stdlib —
// hors radar boundaries ESLint). Localisée en domain/ car logique pure et
// stable, sans plomberie environnement (cf. justification Stop 2 D).
//
// Stratégie : alphabet alphanumérique sans ambiguïté (exclut 0/O, 1/l/I) +
// 2 symboles courants (`!` et `_`). 16 caractères par défaut → entropie
// ~94 bits suffisante pour un mot de passe initial (forcé à changer au
// premier login via must_change_password=true).
//
// La sélection est tirée crypto-aléatoirement (randomInt). On accepte
// l'absence d'une garantie « contient au moins 1 maj/min/digit » : la
// politique de mot de passe forte est appliquée au CHANGEMENT par l'user
// (côté change-password — Zod min(12)), pas au mot de passe transitoire.
// ==============================================================================

import { randomInt } from "node:crypto";

const DEFAULT_LENGTH = 16;
// 64 caractères, ambigus exclus (0, O, 1, l, I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ" + "abcdefghijkmnopqrstuvwxyz" + "23456789" + "!_";

export function generatePassword(length: number = DEFAULT_LENGTH): string {
  if (!Number.isInteger(length) || length < 8 || length > 128) {
    // eslint-disable-next-line no-restricted-syntax -- guard de programmation, jamais atteint en flow nominal
    throw new Error(
      `generatePassword: length doit être entier entre 8 et 128, reçu ${String(length)}`,
    );
  }
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    // String.charAt retourne "" si l'index est hors bornes — randomInt borne
    // déjà dans [0, ALPHABET.length), donc charAt n'est jamais ""; pas de
    // non-null assertion nécessaire.
    chars.push(ALPHABET.charAt(randomInt(0, ALPHABET.length)));
  }
  return chars.join("");
}
