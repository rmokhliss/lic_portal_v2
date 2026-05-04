// ==============================================================================
// LIC v2 — Server Actions /settings/sandbox (Phase 3.F)
//
// Règle L16 : ZÉRO écriture BD. Toutes les opérations sont in-memory. Les clés
// utilisées ici sont éphémères, indépendantes de la CA réelle. Pas d'audit
// (lecture/écriture) — pas de requireRole soit, mais on impose tout de même
// SADMIN pour cantonner cet outil aux administrateurs.
// ==============================================================================

"use server";

import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import {
  decryptAes256Gcm,
  encryptAes256Gcm,
  generateAes256Key,
} from "@/server/modules/crypto/domain/aes";
import {
  generateRsaKeyPair,
  signPayload,
  verifySignature,
} from "@/server/modules/crypto/domain/rsa";

const PayloadSchema = z.string().min(1).max(1_000_000);

export interface GenerateRsaPairOutput {
  privateKeyPem: string;
  publicKeyPem: string;
}

export async function sandboxGenerateRsaPairAction(): Promise<GenerateRsaPairOutput> {
  await requireRole(["SADMIN"]);
  return generateRsaKeyPair();
}

const SignSchema = z.object({
  payload: PayloadSchema,
  privateKeyPem: z.string().min(1),
});

export async function sandboxSignLicTestAction(input: unknown): Promise<{
  licContent: string;
}> {
  await requireRole(["SADMIN"]);
  const parsed = SignSchema.parse(input);
  const signature = signPayload(parsed.payload, parsed.privateKeyPem);
  const lic = {
    payload: parsed.payload,
    signature,
    algorithm: "RSA-SHA256",
    signedAt: new Date().toISOString(),
  };
  return { licContent: JSON.stringify(lic, null, 2) };
}

const VerifySchema = z.object({
  licContent: z.string().min(1),
  publicKeyPem: z.string().min(1),
});

export async function sandboxVerifyLicTestAction(input: unknown): Promise<{
  valid: boolean;
  reason: string;
}> {
  await requireRole(["SADMIN"]);
  const parsed = VerifySchema.parse(input);
  let lic: unknown;
  try {
    lic = JSON.parse(parsed.licContent);
  } catch {
    return { valid: false, reason: "Contenu .lic non parsable (JSON invalide)" };
  }
  if (
    typeof lic !== "object" ||
    lic === null ||
    typeof (lic as { payload?: unknown }).payload !== "string" ||
    typeof (lic as { signature?: unknown }).signature !== "string"
  ) {
    return { valid: false, reason: "Format .lic attendu : { payload, signature, ... }" };
  }
  const { payload, signature } = lic as { payload: string; signature: string };
  try {
    const ok = verifySignature(payload, signature, parsed.publicKeyPem);
    return ok
      ? { valid: true, reason: "Signature vérifiée — payload intact" }
      : { valid: false, reason: "Signature ne correspond pas (payload ou clé incorrects)" };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : "Erreur cryptographique",
    };
  }
}

export async function sandboxGenerateAesKeyAction(): Promise<{ keyBase64: string }> {
  await requireRole(["SADMIN"]);
  return { keyBase64: generateAes256Key() };
}

const EncryptSchema = z.object({
  payload: PayloadSchema,
  keyBase64: z.string().min(1),
});

export async function sandboxEncryptHcTestAction(input: unknown): Promise<{
  hcContent: string;
}> {
  await requireRole(["SADMIN"]);
  const parsed = EncryptSchema.parse(input);
  const encrypted = encryptAes256Gcm(parsed.payload, parsed.keyBase64);
  const hc = {
    encrypted,
    algorithm: "AES-256-GCM",
    encryptedAt: new Date().toISOString(),
  };
  return { hcContent: JSON.stringify(hc, null, 2) };
}

const DecryptSchema = z.object({
  hcContent: z.string().min(1),
  keyBase64: z.string().min(1),
});

export async function sandboxDecryptHcTestAction(input: unknown): Promise<{
  payload: string;
  error: string | null;
}> {
  await requireRole(["SADMIN"]);
  const parsed = DecryptSchema.parse(input);
  let hc: unknown;
  try {
    hc = JSON.parse(parsed.hcContent);
  } catch {
    return { payload: "", error: "Contenu .hc non parsable (JSON invalide)" };
  }
  if (
    typeof hc !== "object" ||
    hc === null ||
    typeof (hc as { encrypted?: unknown }).encrypted !== "string"
  ) {
    return { payload: "", error: "Format .hc attendu : { encrypted, ... }" };
  }
  try {
    const plaintext = decryptAes256Gcm((hc as { encrypted: string }).encrypted, parsed.keyBase64);
    return { payload: plaintext, error: null };
  } catch (err) {
    return {
      payload: "",
      error: err instanceof Error ? err.message : "Erreur de déchiffrement",
    };
  }
}
