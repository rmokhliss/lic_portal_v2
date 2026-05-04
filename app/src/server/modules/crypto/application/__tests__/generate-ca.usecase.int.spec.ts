// ==============================================================================
// LIC v2 — Test d'intégration GenerateCAUseCase (Phase 3.C)
//
// Pattern TRUNCATE+reseed (R-28) : le use-case ouvre une `db.transaction`
// interne (audit transactionnel L3), donc le helper setupTransactionalTests ne
// fonctionne pas (le BEGIN du helper se fait commit-er par le COMMIT interne).
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import postgres from "postgres";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { auditRepository } from "@/server/modules/audit/audit.module";
import { SettingRepositoryPg } from "@/server/modules/settings/adapters/postgres/setting.repository.pg";
import { userRepository } from "@/server/modules/user/user.module";

import { CA_SETTING_KEY } from "../__shared/ca-storage";
import { GenerateCAUseCase } from "../generate-ca.usecase";

// Clé maîtresse de test : 32 octets base64 (0x00..0x1F).
const TEST_MASTER_KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

const url = process.env.DATABASE_URL;
if (url === undefined || url === "") {
  // eslint-disable-next-line no-restricted-syntax -- pré-condition test
  throw new Error("DATABASE_URL absent");
}
const sql = postgres(url, { max: 1 });
const repo = new SettingRepositoryPg();
const useCase = new GenerateCAUseCase(repo, userRepository, auditRepository);

beforeEach(async () => {
  // TRUNCATE + reseed SYSTEM user (référencé par audit_log.user_id si actor=SYSTEM).
  await sql`TRUNCATE TABLE lic_audit_log, lic_settings, lic_users CASCADE`;
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
});

afterAll(async () => {
  // F-13 : cleanup post-tests — les tests insèrent une CA dans lic_settings et
  // un audit CA_GENERATED dans lic_audit_log. On TRUNCATE pour ne pas polluer
  // les specs lancées après (notamment settings/update-settings.spec.ts qui
  // s'attend à lic_settings vide). Reseed SYSTEM user (FK audit_log.user_id).
  await sql`TRUNCATE TABLE lic_audit_log, lic_settings, lic_users CASCADE`;
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

describe("GenerateCAUseCase", () => {
  it("génère une CA, persiste s2m_root_ca, audit CA_GENERATED", async () => {
    const result = await useCase.execute(
      { subjectCN: "S2M Root CA Test", appMasterKey: TEST_MASTER_KEY, validityYears: 5 },
      SYSTEM_USER_ID,
    );

    expect(result.certificatePem).toMatch(/^-----BEGIN CERTIFICATE-----/);
    expect(result.subjectCN).toBe("S2M Root CA Test");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // BD : setting persisté
    const settingRows = await sql<{ key: string }[]>`
      SELECT key FROM lic_settings WHERE key = ${CA_SETTING_KEY}
    `;
    expect(settingRows).toHaveLength(1);

    // BD : audit CA_GENERATED dans la même tx
    const auditRows = await sql<{ action: string; mode: string }[]>`
      SELECT action, mode FROM lic_audit_log
      WHERE entity = 'pki' AND entity_id = '00000000-0000-0000-0000-000000000001'
    `;
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.action).toBe("CA_GENERATED");
    expect(auditRows[0]?.mode).toBe("MANUEL");
  }, 30_000);

  it("throw SPX-LIC-410 si la CA est déjà présente", async () => {
    await useCase.execute(
      { subjectCN: "First CA", appMasterKey: TEST_MASTER_KEY, validityYears: 1 },
      SYSTEM_USER_ID,
    );

    await expect(
      useCase.execute({ subjectCN: "Second CA", appMasterKey: TEST_MASTER_KEY }, SYSTEM_USER_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-410" });
  }, 30_000);
});
