// ==============================================================================
// LIC v2 — AES-256-GCM (Phase 3.A.2)
//
// Wrapper synchrone autour de `node:crypto` pour le chiffrement authentifié.
// Aucune dépendance tierce.
//
// Conformité NIST SP800-38D :
//   - Clé : 256 bits (32 octets) — `aes-256-gcm`
//   - IV  : 96 bits (12 octets) aléatoires (§8.2 — recommandation IV pour GCM)
//   - Tag : 128 bits (16 octets) — taille maximale autorisée
//
// Format sortie `encrypted` : `<iv_b64>:<tag_b64>:<ciphertext_b64>` (3 segments
// séparés par `:`). Choix `:` pour la lisibilité dans les logs/diagnostic.
// Aucun des 3 segments ne contient `:` car ils sont tous en base64 standard.
// ==============================================================================

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { aesGcmTagMismatch, aesKeyInvalid } from "./aes.errors";

const ALGO = "aes-256-gcm" as const;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Génère une clé AES-256 aléatoire (32 octets) encodée en base64.
 * Utilisée pour `lic_settings.healthcheck_shared_aes_key` (clé partagée banque
 * ↔ S2M pour chiffrer les `.hc` healthcheck) ou clé maîtresse de tests.
 */
export function generateAes256Key(): string {
  return randomBytes(KEY_LENGTH).toString("base64");
}

/**
 * Chiffre `plaintext` avec `keyBase64`. Retourne `<iv>:<tag>:<ct>` en base64.
 *
 * - IV régénéré aléatoirement à chaque appel — deux chiffrements du même
 *   plaintext produisent donc deux ciphertexts différents (propriété GCM).
 *
 * Throws :
 *   - SPX-LIC-403 si `keyBase64` n'est pas une clé AES-256 valide.
 */
export function encryptAes256Gcm(plaintext: string, keyBase64: string): string {
  const key = decodeKey(keyBase64);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/**
 * Déchiffre une chaîne au format `<iv>:<tag>:<ct>`.
 *
 * Throws :
 *   - SPX-LIC-402 si format invalide (≠ 3 segments), longueurs IV/tag
 *     anormales, ou tag d'authentification mismatch (tamper détecté).
 *   - SPX-LIC-403 si `keyBase64` n'est pas une clé AES-256 valide.
 */
export function decryptAes256Gcm(encryptedB64: string, keyBase64: string): string {
  const key = decodeKey(keyBase64);
  const parts = encryptedB64.split(":");
  if (parts.length !== 3) {
    throw aesGcmTagMismatch(`format invalide (${String(parts.length)} segments, 3 attendus)`);
  }
  const [ivB64, tagB64, ctB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw aesGcmTagMismatch(
      `IV de longueur invalide (${String(iv.length)}, ${String(IV_LENGTH)} attendu)`,
    );
  }
  if (tag.length !== TAG_LENGTH) {
    throw aesGcmTagMismatch(
      `tag de longueur invalide (${String(tag.length)}, ${String(TAG_LENGTH)} attendu)`,
    );
  }

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch (err) {
    throw aesGcmTagMismatch(err instanceof Error ? err.message : "tag mismatch");
  }
}

function decodeKey(keyBase64: string): Buffer {
  if (keyBase64 === "" || !BASE64_REGEX.test(keyBase64) || keyBase64.length % 4 !== 0) {
    throw aesKeyInvalid("clé non base64 valide");
  }
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== KEY_LENGTH) {
    throw aesKeyInvalid(
      `clé AES-256 attendue ${String(KEY_LENGTH)} octets, reçu ${String(key.length)}`,
    );
  }
  return key;
}
