// ==============================================================================
// LIC v2 — Test d'intégration ChangePasswordUseCase (F-07)
//
// 2 cas couverts :
//   1. Cas nominal : hash change + must_change_password=false + token_version+1
//      + 1 ligne audit log (action=PASSWORD_CHANGED)
//   2. currentPassword KO : throw UnauthorizedError SPX-LIC-002 + AUCUN
//      side-effect BD (transaction rollback)
// ==============================================================================

import "../../../../../scripts/load-env";

import bcryptjs from "bcryptjs";
import postgres from "postgres";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

// Les adapters importent transitively client.ts qui charge `server-only`.
vi.mock("server-only", () => ({}));

import { AuditRecorderPg } from "../../audit/adapters/postgres/audit.recorder.pg";
import { UserRepositoryPg } from "../adapters/postgres/user.repository.pg";
import { ChangePasswordUseCase } from "../application/change-password.usecase";

let sql: postgres.Sql;
let useCase: ChangePasswordUseCase;
const TEST_USER_ID = "01928c8e-cccc-dddd-eeee-ffff00000001";
const TEST_OLD_PASSWORD = "OldPassword-Test-12chars!";
const TEST_NEW_PASSWORD = "NewPassword-Test-12chars-A!";

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- test fixture, pré-condition de runtime
    throw new Error("DATABASE_URL absent — vérifier .env à la racine du repo");
  }
  sql = postgres(url, { max: 1 });
  useCase = new ChangePasswordUseCase(new UserRepositoryPg(), new AuditRecorderPg());
});

afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_users CASCADE`;
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
  await sql.end();
});

async function seedTestUser(): Promise<void> {
  const hash = await bcryptjs.hash(TEST_OLD_PASSWORD, 10);
  await sql`
    INSERT INTO lic_users (
      id, matricule, nom, prenom, email, password_hash,
      must_change_password, token_version, role, actif, created_at, updated_at
    ) VALUES (
      ${TEST_USER_ID}, 'MAT-042', 'Dupont', 'Alice', 'alice@s2m.local',
      ${hash}, true, 0, 'ADMIN', true, NOW(), NOW()
    )
  `;
}

describe("ChangePasswordUseCase — cas nominal", () => {
  it("change le hash, met must_change_password=false, incrémente token_version, log audit", async () => {
    await seedTestUser();

    await useCase.execute({
      userId: TEST_USER_ID,
      currentPassword: TEST_OLD_PASSWORD,
      newPassword: TEST_NEW_PASSWORD,
      userDisplay: "Alice DUPONT (MAT-042)",
    });

    const userRows = await sql<
      {
        password_hash: string;
        must_change_password: boolean;
        token_version: number;
      }[]
    >`
      SELECT password_hash, must_change_password, token_version
      FROM lic_users WHERE id = ${TEST_USER_ID}
    `;
    expect(userRows).toHaveLength(1);
    expect(userRows[0]?.must_change_password).toBe(false);
    expect(userRows[0]?.token_version).toBe(1);
    // Le nouveau hash doit matcher le NEW password
    expect(await bcryptjs.compare(TEST_NEW_PASSWORD, userRows[0]?.password_hash ?? "")).toBe(true);
    // Et NE doit PAS matcher l'OLD
    expect(await bcryptjs.compare(TEST_OLD_PASSWORD, userRows[0]?.password_hash ?? "")).toBe(false);

    // Audit log inséré dans la même transaction
    const auditRows = await sql<{ entity: string; action: string }[]>`
      SELECT entity, action FROM lic_audit_log WHERE entity_id = ${TEST_USER_ID}
    `;
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.entity).toBe("user");
    expect(auditRows[0]?.action).toBe("PASSWORD_CHANGED");
  });
});

describe("ChangePasswordUseCase — currentPassword incorrect", () => {
  it("throw UnauthorizedError SPX-LIC-002 et AUCUN side-effect BD (rollback)", async () => {
    await seedTestUser();

    await expect(
      useCase.execute({
        userId: TEST_USER_ID,
        currentPassword: "WrongPassword!",
        newPassword: TEST_NEW_PASSWORD,
        userDisplay: "Alice DUPONT (MAT-042)",
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-002" });

    // Vérif : aucun changement BD (hash inchangé, token_version inchangée, audit vide)
    const userRows = await sql<
      {
        password_hash: string;
        token_version: number;
        must_change_password: boolean;
      }[]
    >`
      SELECT password_hash, token_version, must_change_password
      FROM lic_users WHERE id = ${TEST_USER_ID}
    `;
    expect(userRows[0]?.token_version).toBe(0);
    expect(userRows[0]?.must_change_password).toBe(true);
    expect(await bcryptjs.compare(TEST_OLD_PASSWORD, userRows[0]?.password_hash ?? "")).toBe(true);

    const auditRows = await sql<{ count: string }[]>`
      SELECT count(*)::text as count FROM lic_audit_log WHERE entity_id = ${TEST_USER_ID}
    `;
    expect(auditRows[0]?.count).toBe("0");
  });
});
