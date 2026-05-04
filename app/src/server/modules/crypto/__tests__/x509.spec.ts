// ==============================================================================
// LIC v2 — Tests X.509 (Phase 3.A.2)
//
// Couverture obligatoire :
//   - generateCACert → PEM valide auto-signé (issuer = subject)
//   - generateClientCert → PEM valide signé par CA (issuer = CA subject)
//   - verifyCertChain → true sur chaîne valide, false sur expiré, false sur autre CA
//   - getCertExpiry → Date future cohérente avec validityYears
//   - SPX-LIC-411 : caPrivateKeyPem vide / invalide
//   - SPX-LIC-422 : CA cert + CA private key incohérents
// ==============================================================================

import { beforeAll, describe, expect, it } from "vitest";

import { generateRsaKeyPair, type RsaKeyPair } from "../domain/rsa";
import { generateCACert, generateClientCert, getCertExpiry, verifyCertChain } from "../domain/x509";
import { captureThrow } from "./helpers/throw";

const CA_SUBJECT = { commonName: "S2M Root CA Test", org: "S2M" } as const;
const CLIENT_SUBJECT = {
  commonName: "Bank Test",
  org: "S2M",
  serialNumber: "CLI-TEST-001",
} as const;

let caKeys: RsaKeyPair;
let altCaKeys: RsaKeyPair;
let clientKeys: RsaKeyPair;
let caCertPem: string;
let altCaCertPem: string;
let clientCertPem: string;

beforeAll(async () => {
  // Trois paires partagées + 2 CA certs partagés (2× 4096-bit keygen ≈ 600ms)
  caKeys = generateRsaKeyPair();
  altCaKeys = generateRsaKeyPair();
  clientKeys = generateRsaKeyPair();
  caCertPem = await generateCACert({
    caPrivateKeyPem: caKeys.privateKeyPem,
    caPublicKeyPem: caKeys.publicKeyPem,
    subject: CA_SUBJECT,
  });
  altCaCertPem = await generateCACert({
    caPrivateKeyPem: altCaKeys.privateKeyPem,
    caPublicKeyPem: altCaKeys.publicKeyPem,
    subject: { commonName: "Other CA", org: "Other" },
  });
  clientCertPem = await generateClientCert({
    clientPublicKeyPem: clientKeys.publicKeyPem,
    caPrivateKeyPem: caKeys.privateKeyPem,
    caCertPem,
    subject: CLIENT_SUBJECT,
  });
}, 30_000);

describe("generateCACert", () => {
  it("retourne un PEM commençant par -----BEGIN CERTIFICATE-----", () => {
    expect(caCertPem).toMatch(/^-----BEGIN CERTIFICATE-----\n/);
    expect(caCertPem).toMatch(/-----END CERTIFICATE-----\n?$/);
  });

  it("certificat auto-signé : issuer === subject", () => {
    const expiry = getCertExpiry(caCertPem);
    // Si on peut extraire l'expiry, le PEM est parsable. Pour l'auto-signature,
    // verifyCertChain(caCertPem, caCertPem) doit retourner true.
    expect(expiry).toBeInstanceOf(Date);
    expect(verifyCertChain(caCertPem, caCertPem)).toBe(true);
  });

  it("validityYears par défaut = 20 (cert valide ~20 ans dans le futur)", () => {
    const expiry = getCertExpiry(caCertPem);
    const now = Date.now();
    const yearsFromNow = (expiry.getTime() - now) / (365.25 * 24 * 3600 * 1000);
    expect(yearsFromNow).toBeGreaterThan(19);
    expect(yearsFromNow).toBeLessThan(21);
  });

  it("validityYears custom respecté", async () => {
    const fresh = generateRsaKeyPair();
    const cert = await generateCACert({
      caPrivateKeyPem: fresh.privateKeyPem,
      caPublicKeyPem: fresh.publicKeyPem,
      subject: CA_SUBJECT,
      validityYears: 5,
    });
    const yearsFromNow = (getCertExpiry(cert).getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000);
    expect(yearsFromNow).toBeGreaterThan(4.9);
    expect(yearsFromNow).toBeLessThan(5.1);
  });
});

describe("generateClientCert", () => {
  it("retourne un PEM valide", () => {
    expect(clientCertPem).toMatch(/^-----BEGIN CERTIFICATE-----\n/);
    expect(clientCertPem).toMatch(/-----END CERTIFICATE-----\n?$/);
  });

  it("validityYears par défaut = 10", () => {
    const yearsFromNow =
      (getCertExpiry(clientCertPem).getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000);
    expect(yearsFromNow).toBeGreaterThan(9);
    expect(yearsFromNow).toBeLessThan(11);
  });
});

describe("verifyCertChain", () => {
  it("true sur chaîne valide (clientCert signé par caCert)", () => {
    expect(verifyCertChain(clientCertPem, caCertPem)).toBe(true);
  });

  it("false si client cert signé par AUTRE CA", () => {
    expect(verifyCertChain(clientCertPem, altCaCertPem)).toBe(false);
  });

  it("false si certificat client expiré (validityYears effective passée)", async () => {
    // Génère un client cert avec validity 0 — donc notAfter = notBefore = now.
    // À l'instant de la vérification (1+ ms plus tard), il est expiré.
    const freshClient = generateRsaKeyPair();
    const expiredClientCert = await generateClientCert({
      clientPublicKeyPem: freshClient.publicKeyPem,
      caPrivateKeyPem: caKeys.privateKeyPem,
      caCertPem,
      subject: CLIENT_SUBJECT,
      validityYears: 0,
    });
    // Petite attente pour que `now > notAfter`
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(verifyCertChain(expiredClientCert, caCertPem)).toBe(false);
  });

  it("false si clientCertPem ne se parse pas", () => {
    expect(verifyCertChain("not a cert", caCertPem)).toBe(false);
  });

  it("false si caCertPem ne se parse pas", () => {
    expect(verifyCertChain(clientCertPem, "not a cert")).toBe(false);
  });
});

describe("getCertExpiry", () => {
  it("retourne une Date future cohérente pour le cert CA", () => {
    const expiry = getCertExpiry(caCertPem);
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  it("throws SPX-LIC-411 si PEM non parsable", () => {
    expect(captureThrow(() => getCertExpiry("not a cert"))).toMatchObject({
      code: "SPX-LIC-411",
    });
  });
});

describe("SPX-LIC-411 — CA absente / clé invalide", () => {
  it("generateCACert throws SPX-LIC-411 si caPrivateKeyPem vide", async () => {
    await expect(
      generateCACert({
        caPrivateKeyPem: "",
        caPublicKeyPem: caKeys.publicKeyPem,
        subject: CA_SUBJECT,
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-411" });
  });

  it("generateCACert throws SPX-LIC-411 si caPrivateKeyPem invalide", async () => {
    await expect(
      generateCACert({
        caPrivateKeyPem: "not a key",
        caPublicKeyPem: caKeys.publicKeyPem,
        subject: CA_SUBJECT,
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-411" });
  });

  it("generateClientCert throws SPX-LIC-411 si caCertPem invalide", async () => {
    await expect(
      generateClientCert({
        clientPublicKeyPem: clientKeys.publicKeyPem,
        caPrivateKeyPem: caKeys.privateKeyPem,
        caCertPem: "not a cert",
        subject: CLIENT_SUBJECT,
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-411" });
  });

  it("generateClientCert throws SPX-LIC-411 si caPrivateKeyPem vide", async () => {
    await expect(
      generateClientCert({
        clientPublicKeyPem: clientKeys.publicKeyPem,
        caPrivateKeyPem: "",
        caCertPem,
        subject: CLIENT_SUBJECT,
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-411" });
  });
});

describe("SPX-LIC-422 — CA cert / private key mismatch", () => {
  it("generateClientCert throws SPX-LIC-422 si caPrivateKeyPem ne correspond pas au caCertPem", async () => {
    // On utilise la clé privée de altCaKeys avec le caCert de caKeys → mismatch
    await expect(
      generateClientCert({
        clientPublicKeyPem: clientKeys.publicKeyPem,
        caPrivateKeyPem: altCaKeys.privateKeyPem,
        caCertPem,
        subject: CLIENT_SUBJECT,
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-422" });
  });
});
