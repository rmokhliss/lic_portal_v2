// ==============================================================================
// LIC v2 — Test d'intégration CreateClientUseCase (Phase 4 étape 4.B)
//
// Pattern TRUNCATE+reseed (R-28) — use-case ouvre db.transaction interne.
// 4 cas couverts : nominal (client + Siège + audit), conflit code, validation
// domaine, vérif Siège créé en cascade.
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { ContactRepositoryPg } from "../../contact/adapters/postgres/contact.repository.pg";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { ClientRepositoryPg } from "../adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../application/create-client.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let useCase: CreateClientUseCase;
let useCaseWithContacts: CreateClientUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  useCase = new CreateClientUseCase(
    new ClientRepositoryPg(),
    new UserRepositoryPg(),
    new AuditRepositoryPg(),
  );
  // Phase 14 — DETTE-LIC-017 : variante avec contactRepository câblé pour
  // tester la création atomique client + Siège + contacts dans une même tx.
  useCaseWithContacts = new CreateClientUseCase(
    new ClientRepositoryPg(),
    new UserRepositoryPg(),
    new AuditRepositoryPg(),
    undefined, // settingRepository : skip PKI (mode legacy)
    new ContactRepositoryPg(),
  );
});

// Pattern aligné user specs : afterEach reseede SYS-000 SEUL (sinon le user
// ACTOR_ID survit et pollue les autres spec files — bootstrap-admin attend
// SYS-000 seul). seedActor() inline dans chaque test qui exécute le use-case.
afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_contacts_clients, lic_entites, lic_clients, lic_users CASCADE`;
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES (${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', false, NOW(), NOW())
  `;
});

afterAll(async () => {
  await sql.end();
});

async function seedActor(): Promise<void> {
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES (${ACTOR_ID}, 'MAT-001', 'ADMIN', 'Système', 'admin@s2m.ma',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'SADMIN', true, NOW(), NOW())
  `;
}

describe("CreateClientUseCase — cas nominal", () => {
  it("INSERT lic_clients + lic_entites Siège + audit dans même tx", async () => {
    await seedActor();
    const result = await useCase.execute(
      {
        codeClient: "BAM",
        raisonSociale: "Bank Al-Maghrib",
        // codePays/codeDevise omis — bootstrap BD ne seede pas lic_pays_ref
        // (pays ajoutés via pnpm db:seed en dev). Les FK sont nullable.
        codeDevise: "MAD",
      },
      ACTOR_ID,
    );

    expect(result.client.codeClient).toBe("BAM");
    expect(result.client.statutClient).toBe("ACTIF");
    expect(result.client.version).toBe(0);
    expect(result.siegeEntiteId).toMatch(/^[0-9a-f-]{36}$/);

    // Vérifie l'entité Siège créée en BD avec FK au client
    const entites = await sql<{ id: string; nom: string; client_id: string }[]>`
      SELECT id, nom, client_id FROM lic_entites WHERE client_id = ${result.client.id}
    `;
    expect(entites).toHaveLength(1);
    expect(entites[0]?.id).toBe(result.siegeEntiteId);
    expect(entites[0]?.nom).toBe("Bank Al-Maghrib"); // default = raisonSociale

    // Audit log
    const audit = await sql<{ action: string; user_display: string | null }[]>`
      SELECT action, user_display FROM lic_audit_log WHERE entity_id = ${result.client.id}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("CLIENT_CREATED");
    expect(audit[0]?.user_display).toBe("Système ADMIN (MAT-001)");
  });

  it("respecte siegeNom personnalisé", async () => {
    await seedActor();
    const result = await useCase.execute(
      {
        codeClient: "ATW",
        raisonSociale: "Attijariwafa Group",
        siegeNom: "Casablanca HQ",
      },
      ACTOR_ID,
    );
    const rows = await sql<{ nom: string }[]>`
      SELECT nom FROM lic_entites WHERE client_id = ${result.client.id}
    `;
    expect(rows[0]?.nom).toBe("Casablanca HQ");
  });
});

describe("CreateClientUseCase — conflit code (SPX-LIC-725)", () => {
  it("rejette si codeClient déjà utilisé — pas d'orphelin BD", async () => {
    await seedActor();
    await useCase.execute({ codeClient: "BAM", raisonSociale: "Bank Al-Maghrib" }, ACTOR_ID);

    await expect(
      useCase.execute({ codeClient: "BAM", raisonSociale: "Doublon" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-725" });

    // Vérif rollback transactionnel : pas de 2e ligne créée + pas d'orphelin
    // entité (le findByCode est dans la tx → pas d'INSERT effectué).
    const clients = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM lic_clients`;
    expect(clients[0]?.count).toBe("1");
    const entites = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM lic_entites`;
    expect(entites[0]?.count).toBe("1");
  });
});

describe("CreateClientUseCase — validation domaine (SPX-LIC-726)", () => {
  it("rejette codeClient au format invalide", async () => {
    await seedActor();
    await expect(
      useCase.execute({ codeClient: "bad code lower!", raisonSociale: "X" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-726" });
  });
});

// ============================================================================
// Phase 14 — DETTE-LIC-017 : contacts à création client (cross-aggregate tx)
// ============================================================================

async function seedTypesContact(): Promise<void> {
  await sql`
    INSERT INTO lic_types_contact_ref (code, libelle, actif)
    VALUES ('ACHAT', 'Achats', true), ('TECHNIQUE', 'Technique', true)
    ON CONFLICT (code) DO UPDATE SET actif = true
  `;
}

describe("CreateClientUseCase — Phase 14 contacts à création (DETTE-LIC-017)", () => {
  it("crée client + Siège + 2 contacts dans la même tx + 1 audit CONTACT_CREATED par contact", async () => {
    await seedActor();
    await seedTypesContact();

    const result = await useCaseWithContacts.execute(
      {
        codeClient: "ATL",
        raisonSociale: "Atlas Bank",
        contacts: [
          { typeContactCode: "ACHAT", nom: "MOULOUDI", prenom: "Karim", email: "k@atlas.ma" },
          { typeContactCode: "TECHNIQUE", nom: "BENNANI", prenom: "Sara" },
        ],
      },
      ACTOR_ID,
    );

    // 2 contacts persistés, attachés à l'entité Siège
    const contacts = await sql<{ nom: string; type_contact_code: string }[]>`
      SELECT nom, type_contact_code FROM lic_contacts_clients
       WHERE entite_id = ${result.siegeEntiteId}::uuid
       ORDER BY nom
    `;
    expect(contacts).toHaveLength(2);
    expect(contacts[0]?.nom).toBe("BENNANI");
    expect(contacts[0]?.type_contact_code).toBe("TECHNIQUE");
    expect(contacts[1]?.nom).toBe("MOULOUDI");

    // Audit : 1 CLIENT_CREATED + 2 CONTACT_CREATED (pas de CERTIFICATE_ISSUED
    // car settingRepository non câblé dans useCaseWithContacts).
    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE client_id = ${result.client.id}::uuid
       ORDER BY created_at, action
    `;
    const actions = audit.map((a) => a.action);
    expect(actions).toContain("CLIENT_CREATED");
    expect(actions.filter((a) => a === "CONTACT_CREATED")).toHaveLength(2);
  });

  it("rollback complet si un contact a un type code invalide (cross-aggregate tx)", async () => {
    await seedActor();
    await seedTypesContact();

    await expect(
      useCaseWithContacts.execute(
        {
          codeClient: "ROLL",
          raisonSociale: "Rollback Bank",
          contacts: [
            { typeContactCode: "ACHAT", nom: "OK" },
            { typeContactCode: "INEXISTANT", nom: "FAIL" }, // FK violation
          ],
        },
        ACTOR_ID,
      ),
    ).rejects.toBeDefined();

    // Aucun client / entité / contact créé (rollback total).
    const clients = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM lic_clients WHERE code_client = 'ROLL'
    `;
    expect(clients[0]?.count).toBe("0");
    const contacts = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM lic_contacts_clients WHERE nom = 'OK'
    `;
    expect(contacts[0]?.count).toBe("0");
  });

  it("création sans contacts → comportement Phase 4 inchangé", async () => {
    await seedActor();
    const result = await useCaseWithContacts.execute(
      { codeClient: "NOC", raisonSociale: "No Contacts" },
      ACTOR_ID,
    );
    const contacts = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM lic_contacts_clients WHERE entite_id = ${result.siegeEntiteId}::uuid
    `;
    expect(contacts[0]?.count).toBe("0");
  });
});

// ============================================================================
// Phase 16 — DETTE-LIC-016 : tests PKI dual-mode createClientUseCase
// ============================================================================
//
// Couvre le chemin PKI strict (settingRepository + appMasterKey injectés) :
//   1. CA présente → cert généré + client_private_key_enc non null
//   2. CA absente → throw SPX-LIC-411 (caAbsentOrInvalid)
//   3. PKI + contacts → atomicité préservée (cert + Siège + contacts dans
//      une même tx)
// ============================================================================

import { generateAes256Key } from "../../crypto/domain/aes";
import { generateRsaKeyPair } from "../../crypto/domain/rsa";
import { generateCACert } from "../../crypto/domain/x509";
import { packCARecord } from "../../crypto/application/__shared/ca-storage";
import { SettingRepositoryPg } from "../../settings/adapters/postgres/setting.repository.pg";

let useCasePki: CreateClientUseCase;
let appMasterKey: string;

function setupPkiUseCase(): void {
  // Variante PKI : settingRepository câblé. ContactRepository également pour
  // tester atomicité PKI + contacts dans une même tx (cas réel prod).
  appMasterKey = generateAes256Key();
  useCasePki = new CreateClientUseCase(
    new ClientRepositoryPg(),
    new UserRepositoryPg(),
    new AuditRepositoryPg(),
    new SettingRepositoryPg(),
    new ContactRepositoryPg(),
  );
}

async function seedCAInSettings(): Promise<void> {
  // Génère une CA réelle et l'insère sous la clé `s2m_root_ca` dans
  // lic_settings au format CARecord (cf. ca-storage.ts).
  const caKeys = generateRsaKeyPair();
  const caCertPem = await generateCACert({
    caPrivateKeyPem: caKeys.privateKeyPem,
    caPublicKeyPem: caKeys.publicKeyPem,
    subject: { commonName: "S2M Test CA", org: "S2M" },
    validityYears: 20,
  });
  const caRecord = packCARecord({
    certificatePem: caCertPem,
    privateKeyPem: caKeys.privateKeyPem,
    subjectCN: "S2M Test CA",
    appMasterKey,
  });
  await sql`
    INSERT INTO lic_settings (key, value, updated_by)
    VALUES ('s2m_root_ca', ${JSON.stringify(caRecord)}::jsonb, ${SYSTEM_USER_ID}::uuid)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

describe("CreateClientUseCase — Phase 16 PKI dual-mode (DETTE-LIC-016)", () => {
  it("CA présente : cert client généré + colonnes PKI persistées", async () => {
    setupPkiUseCase();
    await seedActor();
    await seedCAInSettings();

    const result = await useCasePki.execute(
      { codeClient: "PKI", raisonSociale: "PKI Bank" },
      ACTOR_ID,
      { appMasterKey },
    );

    expect(result.clientCertificatePem).not.toBeNull();
    expect(result.clientCertificatePem).toContain("-----BEGIN CERTIFICATE-----");
    expect(result.certificateExpiresAt).not.toBeNull();

    // Colonnes PKI persistées dans lic_clients
    const rows = await sql<
      {
        client_private_key_enc: string | null;
        client_certificate_pem: string | null;
        client_certificate_expires_at: Date | null;
      }[]
    >`
      SELECT client_private_key_enc, client_certificate_pem, client_certificate_expires_at
      FROM lic_clients WHERE id = ${result.client.id}
    `;
    expect(rows[0]?.client_private_key_enc).not.toBeNull();
    expect(rows[0]?.client_private_key_enc).toMatch(
      /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/,
    );
    expect(rows[0]?.client_certificate_pem).toContain("-----BEGIN CERTIFICATE-----");
    expect(rows[0]?.client_certificate_expires_at).toBeInstanceOf(Date);

    // Audit CLIENT_CREATED + CERTIFICATE_ISSUED dans la même tx
    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE client_id = ${result.client.id}::uuid
       ORDER BY created_at, action
    `;
    const actions = audit.map((a) => a.action);
    expect(actions).toContain("CLIENT_CREATED");
    expect(actions).toContain("CERTIFICATE_ISSUED");
  });

  it("CA absente : throw SPX-LIC-411 + aucun client créé (pré-check hors tx)", async () => {
    setupPkiUseCase();
    await seedActor();
    // Pas de seedCAInSettings → CA absente.
    await sql`DELETE FROM lic_settings WHERE key = 's2m_root_ca'`;

    await expect(
      useCasePki.execute({ codeClient: "NOCA", raisonSociale: "No CA Bank" }, ACTOR_ID, {
        appMasterKey,
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-411" });

    // Aucun client persisté (le pré-check CA est hors tx → pas d'INSERT).
    const clients = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM lic_clients WHERE code_client = 'NOCA'
    `;
    expect(clients[0]?.count).toBe("0");
  });

  it("PKI + contacts : atomicité préservée (cert + Siège + contacts dans une même tx)", async () => {
    setupPkiUseCase();
    await seedActor();
    await seedTypesContact();
    await seedCAInSettings();

    const result = await useCasePki.execute(
      {
        codeClient: "PKIC",
        raisonSociale: "PKI + Contacts",
        contacts: [
          { typeContactCode: "ACHAT", nom: "ALAMI", prenom: "Younès" },
          { typeContactCode: "TECHNIQUE", nom: "EL FASSI", prenom: "Mohamed" },
        ],
      },
      ACTOR_ID,
      { appMasterKey },
    );

    // Cert généré
    expect(result.clientCertificatePem).not.toBeNull();

    // 2 contacts persistés sur l'entité Siège
    const contacts = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM lic_contacts_clients WHERE entite_id = ${result.siegeEntiteId}::uuid
    `;
    expect(contacts[0]?.count).toBe("2");

    // Audit : CLIENT_CREATED + CERTIFICATE_ISSUED + 2 CONTACT_CREATED (4 total)
    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE client_id = ${result.client.id}::uuid
    `;
    const actions = audit.map((a) => a.action);
    expect(actions).toContain("CLIENT_CREATED");
    expect(actions).toContain("CERTIFICATE_ISSUED");
    expect(actions.filter((a) => a === "CONTACT_CREATED")).toHaveLength(2);
  });
});
