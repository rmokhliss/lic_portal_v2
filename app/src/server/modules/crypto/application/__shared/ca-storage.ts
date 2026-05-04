// ==============================================================================
// LIC v2 — Helpers I/O pour la CA S2M (Phase 3.C)
//
// La CA est persistée dans `lic_settings` sous une **unique clé** `s2m_root_ca`
// avec un objet JSONB :
//   {
//     certificatePem  : string  (PEM clair, public)
//     privateKeyEnc   : string  ("iv:tag:ciphertext" base64 — AES-256-GCM avec
//                                APP_MASTER_KEY ; pas en clair en BD)
//     expiresAt       : string  (ISO 8601)
//     subjectCN       : string
//     generatedAt     : string  (ISO 8601)
//   }
//
// Pourquoi 1 clé JSONB plutôt que 4 clés séparées : atomicité côté UPSERT
// (un seul `INSERT ... ON CONFLICT`) + cohérence — impossible d'avoir un cert
// sans sa clé privée associée.
// ==============================================================================

import { decryptAes256Gcm, encryptAes256Gcm } from "../../domain/aes";
import { getCertExpiry } from "../../domain/x509";

export const CA_SETTING_KEY = "s2m_root_ca" as const;

export interface CARecord {
  readonly certificatePem: string;
  readonly privateKeyEnc: string;
  readonly expiresAt: string;
  readonly subjectCN: string;
  readonly generatedAt: string;
}

/** Construit la valeur à persister à partir des matériaux générés. */
export function packCARecord(input: {
  certificatePem: string;
  privateKeyPem: string;
  subjectCN: string;
  appMasterKey: string;
}): CARecord {
  const expiresAt = getCertExpiry(input.certificatePem).toISOString();
  return {
    certificatePem: input.certificatePem,
    privateKeyEnc: encryptAes256Gcm(input.privateKeyPem, input.appMasterKey),
    expiresAt,
    subjectCN: input.subjectCN,
    generatedAt: new Date().toISOString(),
  };
}

/** Validation runtime du shape JSON (BD source de vérité, mais defensive). */
export function isCARecord(value: unknown): value is CARecord {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.certificatePem === "string" &&
    typeof o.privateKeyEnc === "string" &&
    typeof o.expiresAt === "string" &&
    typeof o.subjectCN === "string" &&
    typeof o.generatedAt === "string"
  );
}

/** Déchiffre la clé privée CA depuis le record persisté. */
export function unwrapCAPrivateKey(record: CARecord, appMasterKey: string): string {
  return decryptAes256Gcm(record.privateKeyEnc, appMasterKey);
}
