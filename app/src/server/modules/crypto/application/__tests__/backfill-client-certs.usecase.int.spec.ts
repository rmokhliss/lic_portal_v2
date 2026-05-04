// ==============================================================================
// LIC v2 — Test d'intégration BackfillClientCertificatesUseCase (Phase 3.E)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import postgres from "postgres";

import { SYSTEM_USER_ID, SYSTEM_USER_DISPLAY } from "@s2m-lic/shared/constants/system-user";

import { auditRepository } from "@/server/modules/audit/audit.module";
import { SettingRepositoryPg } from "@/server/modules/settings/adapters/postgres/setting.repository.pg";
import { userRepository } from "@/server/modules/user/user.module";

import { BackfillClientCertificatesUseCase } from "../backfill-client-certs.usecase";
import { GenerateCAUseCase } from "../generate-ca.usecase";

const TEST_MASTER_KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

const url = process.env.DATABASE_URL;
if (url === undefined || url === "") {
  // eslint-disable-next-line no-restricted-syntax -- pré-condition test
  throw new Error("DATABASE_URL absent");
}
const sql = postgres(url, { max: 1 });
const repo = new SettingRepositoryPg();
const backfillUC = new BackfillClientCertificatesUseCase(repo, auditRepository);
const generateCaUC = new GenerateCAUseCase(repo, userRepository, auditRepository);

beforeEach(async () => {
  await sql`
    TRUNCATE TABLE lic_audit_log, lic_settings, lic_entites, lic_clients, lic_users CASCADE
  `;
  await sql`
    INSERT INTO lic_users (
      id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at
    ) VALUES (
      ${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', false, NOW(), NOW())
  `;
});

afterAll(async () => {
  // F-13 : cleanup post-tests — voir generate-ca.usecase.int.spec.ts.
  await sql`
    TRUNCATE TABLE lic_audit_log, lic_settings, lic_entites, lic_clients, lic_users CASCADE
  `;
  await sql`
    INSERT INTO lic_users (
      id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at
    ) VALUES (
      ${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', false, NOW(), NOW()
    )
  `;
  await sql.end();
});

async function insertClientWithoutCert(codeClient: string, raisonSociale: string): Promise<void> {
  await sql`
    INSERT INTO lic_clients (code_client, raison_sociale, statut_client, version, actif)
    VALUES (${codeClient}, ${raisonSociale}, 'ACTIF', 0, true)
  `;
}

describe("BackfillClientCertificatesUseCase", () => {
  it("countPending() retourne 0 quand aucun client", async () => {
    const count = await backfillUC.countPending();
    expect(count).toBe(0);
  });

  it("countPending() compte les clients sans certificat", async () => {
    await insertClientWithoutCert("CLI-001", "Bank One");
    await insertClientWithoutCert("CLI-002", "Bank Two");
    const count = await backfillUC.countPending();
    expect(count).toBe(2);
  });

  it("execute() throw SPX-LIC-411 si CA absente", async () => {
    await insertClientWithoutCert("CLI-003", "Bank Three");
    await expect(
      backfillUC.execute({
        appMasterKey: TEST_MASTER_KEY,
        systemUserId: SYSTEM_USER_ID,
        systemUserDisplay: SYSTEM_USER_DISPLAY,
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-411" });
  });

  it("execute() process les clients sans cert + persiste les 3 colonnes PKI", async () => {
    await generateCaUC.execute(
      { subjectCN: "S2M Root CA Test", appMasterKey: TEST_MASTER_KEY, validityYears: 5 },
      SYSTEM_USER_ID,
    );
    await insertClientWithoutCert("CLI-004", "Bank Four");

    const result = await backfillUC.execute({
      appMasterKey: TEST_MASTER_KEY,
      systemUserId: SYSTEM_USER_ID,
      systemUserDisplay: SYSTEM_USER_DISPLAY,
    });
    expect(result.processed).toBe(1);
    expect(result.failed).toHaveLength(0);

    const rows = await sql<
      { client_certificate_pem: string | null; client_private_key_enc: string | null }[]
    >`
      SELECT client_certificate_pem, client_private_key_enc
      FROM lic_clients WHERE code_client = 'CLI-004'
    `;
    expect(rows[0]?.client_certificate_pem).toMatch(/^-----BEGIN CERTIFICATE-----/);
    expect(rows[0]?.client_private_key_enc).toMatch(
      /^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/,
    );

    // Audit CERTIFICATE_ISSUED en mode SCRIPT
    const auditRows = await sql<{ action: string; mode: string }[]>`
      SELECT action, mode FROM lic_audit_log
      WHERE action = 'CERTIFICATE_ISSUED' AND mode = 'SCRIPT'
    `;
    expect(auditRows).toHaveLength(1);
  }, 60_000);
});
