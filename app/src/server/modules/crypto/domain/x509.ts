// ==============================================================================
// LIC v2 — Primitives X.509 (Phase 3.A.2)
//
// Architecture mixte sync/async — justifiée par les capacités natives :
//
//   • Lecture / vérification : `node:crypto.X509Certificate` (Node 24, sync).
//     Couvre `verifyCertChain` + `getCertExpiry` sans dépendance tierce.
//
//   • Génération : `@peculiar/x509` v2 (async, basé sur Web Crypto API).
//     `node:crypto` ne propose pas de générateur X.509 → seul moyen de respecter
//     la règle "pas de cryptographie custom" (ASN.1 manuel = forme custom).
//     Cf. ADR-0019 (Phase 3.H) pour la justification de la dérogation.
//
// Algorithme de signature : RSASSA-PKCS1-v1_5 + SHA-256 (cohérent avec rsa.ts
// 3.A.1 — RFC 8017 §8.2, déterministe, compat .lic v1).
// ==============================================================================

import "reflect-metadata"; // Polyfill requis par @peculiar/x509 (tsyringe).

import { X509Certificate } from "node:crypto";

import * as x509 from "@peculiar/x509";

import { caAbsentOrInvalid, caCertKeyMismatch } from "./x509.errors";

// Configure le provider Web Crypto pour @peculiar/x509. Node 24 expose
// `globalThis.crypto` (Web Crypto API standard, pas besoin d'un polyfill).
x509.cryptoProvider.set(globalThis.crypto);

const SIGNING_ALGORITHM: RsaHashedImportParams = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
};

const DEFAULT_CA_VALIDITY_YEARS = 20;
const DEFAULT_CLIENT_VALIDITY_YEARS = 10;

export interface CASubject {
  readonly commonName: string;
  readonly org: string;
}

export interface ClientSubject extends CASubject {
  /**
   * Numéro de série lisible dans le DN du certificat client (≠ `serialNumber`
   * du certificat lui-même qui est un identifiant interne X.509). On y stocke
   * typiquement le code client S2M (ex: `CLI-2026-001`).
   */
  readonly serialNumber: string;
}

/**
 * Génère le certificat CA auto-signé S2M.
 *
 * Throws SPX-LIC-411 si `caPrivateKeyPem` ou `caPublicKeyPem` invalide / vide.
 */
export async function generateCACert(opts: {
  caPrivateKeyPem: string;
  caPublicKeyPem: string;
  subject: CASubject;
  validityYears?: number;
}): Promise<string> {
  const validityYears = opts.validityYears ?? DEFAULT_CA_VALIDITY_YEARS;
  const { privateKey, publicKey } = await importRsaKeyPair(
    opts.caPrivateKeyPem,
    opts.caPublicKeyPem,
  );

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: randomSerial(),
    name: dnFromSubject(opts.subject),
    notBefore: new Date(),
    notAfter: addYears(new Date(), validityYears),
    signingAlgorithm: SIGNING_ALGORITHM,
    keys: { privateKey, publicKey },
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign,
        true,
      ),
    ],
  });

  return cert.toString("pem");
}

/**
 * Génère un certificat client signé par la CA S2M.
 *
 * Throws :
 *   - SPX-LIC-411 si `caPrivateKeyPem` ou `caCertPem` invalide / vide.
 *   - SPX-LIC-422 si la clé privée CA ne correspond pas au cert CA fourni
 *     (la signature de test sur un challenge ne se vérifie pas avec la clé
 *     publique extraite du cert CA).
 */
export async function generateClientCert(opts: {
  clientPublicKeyPem: string;
  caPrivateKeyPem: string;
  caCertPem: string;
  subject: ClientSubject;
  validityYears?: number;
}): Promise<string> {
  const validityYears = opts.validityYears ?? DEFAULT_CLIENT_VALIDITY_YEARS;

  let caCert: x509.X509Certificate;
  try {
    caCert = new x509.X509Certificate(opts.caCertPem);
  } catch (err) {
    throw caAbsentOrInvalid(`cert CA non parsable : ${errMsg(err)}`);
  }

  const caPrivateKey = await importRsaPrivateKey(opts.caPrivateKeyPem);
  const caPublicKey = await caCert.publicKey.export(SIGNING_ALGORITHM, ["verify"]);

  await assertKeyPairConsistent(caPrivateKey, caPublicKey);

  const clientPublicKey = await importRsaPublicKey(opts.clientPublicKeyPem);

  const cert = await x509.X509CertificateGenerator.create({
    serialNumber: randomSerial(),
    subject: dnFromClientSubject(opts.subject),
    issuer: caCert.subject,
    notBefore: new Date(),
    notAfter: addYears(new Date(), validityYears),
    signingAlgorithm: SIGNING_ALGORITHM,
    publicKey: clientPublicKey,
    signingKey: caPrivateKey,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyEncipherment,
        true,
      ),
    ],
  });

  return cert.toString("pem");
}

/**
 * Vérifie qu'un certificat client a bien été émis par la CA fournie ET que la
 * date courante est dans la période de validité du certificat client.
 *
 * Sync — utilise `node:crypto.X509Certificate` natif Node 24.
 * Retourne `false` (jamais throw) sur tout cas négatif : cert non parsable,
 * issuer mismatch, signature invalide, période expirée.
 */
export function verifyCertChain(clientCertPem: string, caCertPem: string): boolean {
  let client: X509Certificate;
  let ca: X509Certificate;
  try {
    client = new X509Certificate(clientCertPem);
    ca = new X509Certificate(caCertPem);
  } catch {
    return false;
  }

  if (!client.checkIssued(ca)) return false;
  if (!client.verify(ca.publicKey)) return false;

  const now = Date.now();
  const validFrom = Date.parse(client.validFrom);
  const validTo = Date.parse(client.validTo);
  if (Number.isNaN(validFrom) || Number.isNaN(validTo)) return false;
  if (now < validFrom || now > validTo) return false;

  return true;
}

/**
 * Extrait la date d'expiration `notAfter` d'un certificat PEM.
 * Sync — `node:crypto.X509Certificate`.
 *
 * Throws SPX-LIC-411 si le PEM ne se parse pas en certificat.
 */
export function getCertExpiry(certPem: string): Date {
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(certPem);
  } catch (err) {
    throw caAbsentOrInvalid(`certificat non parsable : ${errMsg(err)}`);
  }
  const ts = Date.parse(cert.validTo);
  if (Number.isNaN(ts)) {
    throw caAbsentOrInvalid(`validTo non parsable : ${cert.validTo}`);
  }
  return new Date(ts);
}

// =============================================================================
// Helpers internes
// =============================================================================

function dnFromSubject(s: CASubject): string {
  return `CN=${escape(s.commonName)},O=${escape(s.org)}`;
}

function dnFromClientSubject(s: ClientSubject): string {
  // OID 2.5.4.5 = serialNumber (RFC 4519). On utilise l'OID plutôt que le nom
  // court parce que `@peculiar/x509` n'a pas `serialNumber` dans son registre
  // de noms par défaut (seulement CN, O, OU, C, ST, L, DC, E, G, I, S/SN, T).
  return `CN=${escape(s.commonName)},O=${escape(s.org)},2.5.4.5=${escape(s.serialNumber)}`;
}

function escape(value: string): string {
  // Échappe les caractères réservés du Distinguished Name (RFC 4514 §2.4).
  return value.replace(/([,+"\\<>;=])/g, "\\$1");
}

function addYears(date: Date, years: number): Date {
  const out = new Date(date);
  out.setUTCFullYear(out.getUTCFullYear() + years);
  return out;
}

function randomSerial(): string {
  // Numéro de série X.509 — entier positif sur ≤20 octets (RFC 5280 §4.1.2.2).
  // 16 octets aléatoires en hex = 32 caractères, premier nibble forcé < 8 pour
  // garantir un entier positif en représentation big-endian ASN.1 INTEGER.
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[0] = (bytes[0] ?? 0) & 0x7f;
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  if (b64 === "") {
    throw caAbsentOrInvalid("PEM vide");
  }
  const buf = Buffer.from(b64, "base64");
  // Slice exact range: Buffer peut partager un ArrayBuffer plus grand.
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  let der: ArrayBuffer;
  try {
    der = pemToDer(pem);
  } catch (err) {
    throw caAbsentOrInvalid(errMsg(err));
  }
  try {
    // `extractable: true` — @peculiar/x509 doit re-sérialiser la clé en ASN.1
    // pour la mettre dans le SubjectPublicKeyInfo du certificat.
    return await globalThis.crypto.subtle.importKey("pkcs8", der, SIGNING_ALGORITHM, true, [
      "sign",
    ]);
  } catch (err) {
    throw caAbsentOrInvalid(`PKCS#8 non importable : ${errMsg(err)}`);
  }
}

async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  let der: ArrayBuffer;
  try {
    der = pemToDer(pem);
  } catch (err) {
    throw caAbsentOrInvalid(errMsg(err));
  }
  try {
    return await globalThis.crypto.subtle.importKey("spki", der, SIGNING_ALGORITHM, true, [
      "verify",
    ]);
  } catch (err) {
    throw caAbsentOrInvalid(`SPKI non importable : ${errMsg(err)}`);
  }
}

async function importRsaKeyPair(
  privatePem: string,
  publicPem: string,
): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey }> {
  const [privateKey, publicKey] = await Promise.all([
    importRsaPrivateKey(privatePem),
    importRsaPublicKey(publicPem),
  ]);
  return { privateKey, publicKey };
}

/**
 * Vérifie que la clé privée signe un challenge dont la signature se vérifie
 * avec la clé publique. Garantit la cohérence cert CA ↔ private key avant
 * d'utiliser la paire pour signer un certificat client.
 */
async function assertKeyPairConsistent(privateKey: CryptoKey, publicKey: CryptoKey): Promise<void> {
  const challenge = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const signature = await globalThis.crypto.subtle.sign(
    SIGNING_ALGORITHM.name,
    privateKey,
    challenge,
  );
  const ok = await globalThis.crypto.subtle.verify(
    SIGNING_ALGORITHM.name,
    publicKey,
    signature,
    challenge,
  );
  if (!ok) {
    throw caCertKeyMismatch(
      "la signature challenge avec la clé privée ne se vérifie pas avec la clé publique du cert CA",
    );
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "erreur inconnue";
}
