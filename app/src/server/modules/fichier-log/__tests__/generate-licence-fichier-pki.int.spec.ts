// ==============================================================================
// LIC v2 — Tests d'intégration generate-licence-fichier (Phase 14 — PKI bouclage)
//
// Couvre le mode PKI (DETTE-LIC-008 résolue) :
//   - Signature RSA valide vérifiable via clé publique CA
//   - Format .lic conforme ADR-0002 (JSON + sep + sig + cert)
//   - SPX-LIC-411 si client sans cert (legacy non backfillé)
// ==============================================================================

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import postgres from "postgres";

import { encryptAes256Gcm, generateAes256Key } from "../../crypto/domain/aes";
import { generateRsaKeyPair, verifySignature } from "../../crypto/domain/rsa";
import { generateCACert, generateClientCert, getCertExpiry } from "../../crypto/domain/x509";
import { ArticleRepositoryPg } from "../../article/adapters/postgres/article.repository.pg";
import { ClientRepositoryPg } from "../../client/adapters/postgres/client.repository.pg";
import { EntiteRepositoryPg } from "../../entite/adapters/postgres/entite.repository.pg";
import { LicenceRepositoryPg } from "../../licence/adapters/postgres/licence.repository.pg";
import { LicenceArticleRepositoryPg } from "../../licence-article/adapters/postgres/licence-article.repository.pg";
import { FichierLogRepositoryPg } from "../adapters/postgres/fichier-log.repository.pg";
import {
  CERTIFICATE_SEPARATOR,
  GenerateLicenceFichierUseCase,
  SIGNATURE_SEPARATOR,
} from "../application/generate-licence-fichier.usecase";
import { LogFichierGenereUseCase } from "../application/log-fichier-genere.usecase";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000099";

let sql: postgres.Sql;
let useCase: GenerateLicenceFichierUseCase;
let appMasterKey: string;
let caKeys: { privateKeyPem: string; publicKeyPem: string };
let caCertPem: string;

beforeAll(async () => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });

  appMasterKey = generateAes256Key();
  caKeys = generateRsaKeyPair();
  caCertPem = await generateCACert({
    caPrivateKeyPem: caKeys.privateKeyPem,
    caPublicKeyPem: caKeys.publicKeyPem,
    subject: { commonName: "S2M Test CA", org: "S2M" },
    validityYears: 20,
  });

  const licenceRepo = new LicenceRepositoryPg();
  const clientRepo = new ClientRepositoryPg();
  const entiteRepo = new EntiteRepositoryPg();
  const articleRepo = new ArticleRepositoryPg();
  const liaRepo = new LicenceArticleRepositoryPg();
  const fichierRepo = new FichierLogRepositoryPg();
  const logFichier = new LogFichierGenereUseCase(fichierRepo);

  useCase = new GenerateLicenceFichierUseCase(
    licenceRepo,
    clientRepo,
    entiteRepo,
    liaRepo,
    articleRepo,
    logFichier,
  );
});

beforeEach(async () => {
  await sql`TRUNCATE TABLE
    lic_fichiers_log, lic_audit_log, lic_article_volume_history,
    lic_licence_articles, lic_licence_produits, lic_renouvellements,
    lic_licences, lic_contacts_clients, lic_entites, lic_clients,
    lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES
      (${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'SADMIN', false, NOW(), NOW()),
      (${ACTOR_ID}, 'MAT-099', 'PKI', 'Test', 'pki-test@s2m.ma',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'ADMIN', true, NOW(), NOW())
  `;
});

afterAll(async () => {
  await sql`TRUNCATE TABLE
    lic_fichiers_log, lic_audit_log, lic_article_volume_history,
    lic_licence_articles, lic_licence_produits, lic_renouvellements,
    lic_licences, lic_contacts_clients, lic_entites, lic_clients,
    lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
  await sql.end();
});

interface FixtureWithCert {
  readonly licenceId: string;
  readonly clientPublicKeyPem: string;
  readonly clientCertPem: string;
}

async function setupFixtureWithCert(): Promise<FixtureWithCert> {
  const clientKeys = generateRsaKeyPair();
  const clientCertPem = await generateClientCert({
    clientPublicKeyPem: clientKeys.publicKeyPem,
    caPrivateKeyPem: caKeys.privateKeyPem,
    caCertPem,
    subject: { commonName: "Test Bank", org: "S2M", serialNumber: "TST-PKI" },
  });
  const certExpiresAt = getCertExpiry(clientCertPem);
  const privateKeyEnc = encryptAes256Gcm(clientKeys.privateKeyPem, appMasterKey);

  const clients = await sql<{ id: string }[]>`
    INSERT INTO lic_clients (
      code_client, raison_sociale, statut_client,
      client_private_key_enc, client_certificate_pem, client_certificate_expires_at,
      cree_par, created_at, updated_at
    )
    VALUES (
      'TST-PKI', 'Test Bank PKI', 'ACTIF',
      ${privateKeyEnc}, ${clientCertPem}, ${certExpiresAt.toISOString()},
      ${ACTOR_ID}::uuid, NOW(), NOW()
    )
    RETURNING id
  `;
  const clientId = clients[0]?.id;
  if (clientId === undefined) throw new TypeError("INSERT clients failed");

  const entites = await sql<{ id: string }[]>`
    INSERT INTO lic_entites (client_id, nom, actif, cree_par, created_at, updated_at)
    VALUES (${clientId}::uuid, 'Siège', true, ${ACTOR_ID}::uuid, NOW(), NOW())
    RETURNING id
  `;
  const entiteId = entites[0]?.id;
  if (entiteId === undefined) throw new TypeError("INSERT entites failed");

  const dateDebut = new Date();
  const dateFin = new Date();
  dateFin.setDate(dateFin.getDate() + 365);
  const licences = await sql<{ id: string }[]>`
    INSERT INTO lic_licences (
      reference, client_id, entite_id, date_debut, date_fin, status,
      version, renouvellement_auto, notif_envoyee, cree_par, created_at, updated_at
    )
    VALUES (
      'LIC-2026-901', ${clientId}::uuid, ${entiteId}::uuid,
      ${dateDebut.toISOString()}, ${dateFin.toISOString()}, 'ACTIF',
      0, false, false, ${ACTOR_ID}::uuid, NOW(), NOW()
    )
    RETURNING id
  `;
  const licenceId = licences[0]?.id;
  if (licenceId === undefined) throw new TypeError("INSERT licences failed");

  return { licenceId, clientPublicKeyPem: clientKeys.publicKeyPem, clientCertPem };
}

async function setupFixtureWithoutCert(): Promise<{ licenceId: string }> {
  const clients = await sql<{ id: string }[]>`
    INSERT INTO lic_clients (code_client, raison_sociale, statut_client, cree_par, created_at, updated_at)
    VALUES ('LEGACY', 'Legacy Bank', 'ACTIF', ${ACTOR_ID}::uuid, NOW(), NOW())
    RETURNING id
  `;
  const clientId = clients[0]?.id;
  if (clientId === undefined) throw new TypeError("INSERT clients failed");

  const entites = await sql<{ id: string }[]>`
    INSERT INTO lic_entites (client_id, nom, actif, cree_par, created_at, updated_at)
    VALUES (${clientId}::uuid, 'Siège', true, ${ACTOR_ID}::uuid, NOW(), NOW())
    RETURNING id
  `;
  const entiteId = entites[0]?.id;
  if (entiteId === undefined) throw new TypeError("INSERT entites failed");

  const dateDebut = new Date();
  const dateFin = new Date();
  dateFin.setDate(dateFin.getDate() + 365);
  const licences = await sql<{ id: string }[]>`
    INSERT INTO lic_licences (
      reference, client_id, entite_id, date_debut, date_fin, status,
      version, renouvellement_auto, notif_envoyee, cree_par, created_at, updated_at
    )
    VALUES (
      'LIC-2026-902', ${clientId}::uuid, ${entiteId}::uuid,
      ${dateDebut.toISOString()}, ${dateFin.toISOString()}, 'ACTIF',
      0, false, false, ${ACTOR_ID}::uuid, NOW(), NOW()
    )
    RETURNING id
  `;
  const licenceId = licences[0]?.id;
  if (licenceId === undefined) throw new TypeError("INSERT licences failed");

  return { licenceId };
}

describe("GenerateLicenceFichier — mode PKI (Phase 14)", () => {
  it("signe le contentJson avec la clé privée client et la signature est vérifiable via la clé publique", async () => {
    const fixture = await setupFixtureWithCert();
    const result = await useCase.execute({ licenceId: fixture.licenceId }, ACTOR_ID, {
      appMasterKey,
    });

    const signature = result.signatureBase64;
    expect(signature).not.toBeNull();
    if (signature === null) throw new TypeError("signatureBase64 null en mode PKI");
    expect(signature).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);

    const verified = verifySignature(result.contentJson, signature, fixture.clientPublicKeyPem);
    expect(verified).toBe(true);
  });

  it("produit un .lic au format ADR-0002 (JSON + séparateurs + cert client embarqué)", async () => {
    const fixture = await setupFixtureWithCert();
    const result = await useCase.execute({ licenceId: fixture.licenceId }, ACTOR_ID, {
      appMasterKey,
    });

    expect(result.signedPayload).toContain(SIGNATURE_SEPARATOR);
    expect(result.signedPayload).toContain(CERTIFICATE_SEPARATOR);
    expect(result.signedPayload.startsWith(result.contentJson)).toBe(true);
    expect(result.signedPayload).toContain(fixture.clientCertPem);

    // Hash calculé sur le payload final signé (anti-altération end-to-end).
    const splitIndex = result.signedPayload.indexOf(SIGNATURE_SEPARATOR);
    const jsonPart = result.signedPayload.slice(0, splitIndex);
    expect(jsonPart).toBe(result.contentJson);
  });

  it("throw SPX-LIC-411 si client sans certificat (legacy non backfillé)", async () => {
    const fixture = await setupFixtureWithoutCert();
    await expect(
      useCase.execute({ licenceId: fixture.licenceId }, ACTOR_ID, { appMasterKey }),
    ).rejects.toMatchObject({ code: "SPX-LIC-411" });
  });
});
