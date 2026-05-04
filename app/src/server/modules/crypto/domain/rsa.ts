// ==============================================================================
// LIC v2 — Primitives RSA (Phase 3.A.1)
//
// Briques crypto pures basées exclusivement sur node:crypto (Node 24). Aucune
// dépendance tierce — node-forge a été retiré (ADR 0019).
//
// Algorithmes :
//   - keygen   : RSA-4096 (génération CA + clés clients)
//   - signature: RSASSA-PKCS1-v1_5 avec SHA-256 (RFC 8017 §8.2)
//   - encodage : PEM (PKCS#8 pour les clés privées, SPKI pour les publiques)
//
// Le module est `domain/` pur : pas d'I/O, pas de Zod, pas de Drizzle. Toute
// orchestration (persistance chiffrée AES-GCM, audit, etc.) se fait dans les
// use-cases en couche application/ aux étapes 3.C et suivantes.
//
// Coût mesuré (Node 24, modulus 4096) :
//   - generateRsaKeyPair      ≈ 200-500 ms (appel rare : création CA / client)
//   - signPayload             ≈ <5 ms même payload 1 Mo
//   - verifySignature         ≈ <2 ms même payload 1 Mo
// ==============================================================================

import { createSign, createVerify, generateKeyPairSync } from "node:crypto";

import { rsaKeyDecodingFailed, rsaSignatureInvalid } from "./rsa.errors";

export interface RsaKeyPair {
  /** PKCS#8 PEM — `-----BEGIN PRIVATE KEY----- … -----END PRIVATE KEY-----`. */
  readonly privateKeyPem: string;
  /** SPKI PEM — `-----BEGIN PUBLIC KEY----- … -----END PUBLIC KEY-----`. */
  readonly publicKeyPem: string;
}

const RSA_MODULUS_LENGTH = 4096;
const SIGNATURE_ALGORITHM = "RSA-SHA256";
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Génère une paire RSA-4096. Synchrone, ~200-500 ms — appel rare (création CA
 * ou nouvelle clé client uniquement). Sortie PEM PKCS#8 (privée) + SPKI (publique).
 */
export function generateRsaKeyPair(): RsaKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: RSA_MODULUS_LENGTH,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

/**
 * Signe un payload avec RSASSA-PKCS1-v1_5 + SHA-256. Retourne la signature
 * encodée base64 (≈684 caractères pour modulus 4096).
 *
 * Throws :
 *   - SPX-LIC-401 si `privateKeyPem` ne décode pas en clé RSA valide.
 */
export function signPayload(payload: Buffer | string, privateKeyPem: string): string {
  const data = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
  try {
    const signer = createSign(SIGNATURE_ALGORITHM);
    signer.update(data);
    signer.end();
    return signer.sign(privateKeyPem).toString("base64");
  } catch (err) {
    throw rsaKeyDecodingFailed(err instanceof Error ? err.message : "unknown error");
  }
}

/**
 * Vérifie une signature base64 contre un payload + clé publique PEM.
 * Retourne `true` si valide, `false` sinon (signature techniquement valide mais
 * ne correspondant pas au payload, ou produit avec une autre clé).
 *
 * Throws :
 *   - SPX-LIC-400 si `signatureBase64` n'est pas du base64 valide
 *     (caractères non base64, ou longueur non multiple de 4 après padding).
 *     Cas distinct d'une signature qui se décode mais ne match pas → `false`.
 *   - SPX-LIC-401 si `publicKeyPem` ne décode pas en clé RSA valide.
 *
 * Note : la chaîne vide `""` est traitée comme base64 valide (0 octet décodé) ;
 * la vérification renvoie alors naturellement `false`.
 */
export function verifySignature(
  payload: Buffer | string,
  signatureBase64: string,
  publicKeyPem: string,
): boolean {
  if (!isStrictBase64(signatureBase64)) {
    throw rsaSignatureInvalid("signature non base64 valide");
  }
  const data = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
  const signature = Buffer.from(signatureBase64, "base64");
  try {
    const verifier = createVerify(SIGNATURE_ALGORITHM);
    verifier.update(data);
    verifier.end();
    return verifier.verify(publicKeyPem, signature);
  } catch (err) {
    throw rsaKeyDecodingFailed(err instanceof Error ? err.message : "unknown error");
  }
}

/**
 * Validation stricte du base64 : caractères dans [A-Za-z0-9+/] avec padding =
 * optionnel, longueur multiple de 4 (après padding implicite). La chaîne vide
 * est acceptée (cas trivial 0 octet) — la vérification de signature retournera
 * naturellement `false` puisqu'aucune signature RSA-4096 n'a 0 octet.
 *
 * Buffer.from(str, "base64") est trop laxiste (ignore silencieusement les
 * caractères invalides), d'où cette validation amont.
 */
function isStrictBase64(value: string): boolean {
  if (value === "") {
    return true;
  }
  if (!BASE64_REGEX.test(value)) {
    return false;
  }
  return value.length % 4 === 0;
}
