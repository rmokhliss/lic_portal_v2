// ==============================================================================
// LIC v2 — Test d'intégration ChangePasswordUseCase (F-07, refactor F-08)
//
// 2 cas couverts :
//   1. Cas nominal : hash change + must_change_password=false + token_version+1
//      + 1 ligne audit log (action=PASSWORD_CHANGED)
//   2. currentPassword KO : throw UnauthorizedError SPX-LIC-002 + AUCUN
//      side-effect BD (transaction rollback)
//
// F-08 : pattern BEGIN/ROLLBACK via test-helpers (vs TRUNCATE de F-07).
// Les adapters reçoivent ctx.db en injection pour participer à la transaction
// du test (règle DI optionnelle).
//
// Note : le ChangePasswordUseCase ouvre `db.transaction()` en interne (singleton
// `db`, pas notre ctx.db). Pour que cette transaction interne participe à
// notre BEGIN/ROLLBACK, il faudrait injecter `db` dans le use-case aussi —
// scope F-09+ (refactor du use-case pour DI db). À F-08, on accepte que la
// transaction interne du use-case échappe à notre BEGIN/ROLLBACK et on fait
// un cleanup TRUNCATE manuel après chaque test.
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { MockPasswordHasher } from "../adapters/mock/password-hasher.mock";
import { UserRepositoryPg } from "../adapters/postgres/user.repository.pg";
import { ChangePasswordUseCase } from "../application/change-password.usecase";

import postgres from "postgres";

// Phase 15 — MockPasswordHasher (déterministe `mock:<plaintext>`) au lieu de
// bcrypt cost 10 → gain perf ~5-10× sur cette spec.
const passwordHasher = new MockPasswordHasher();

const TEST_USER_ID = "01928c8e-cccc-dddd-eeee-ffff00000001";
const TEST_OLD_PASSWORD = "OldPassword-Test-12chars!";
const TEST_NEW_PASSWORD = "NewPassword-Test-12chars-A!";

// Connexion dédiée pour les SELECT de vérif après l'exécution du use-case.
// Le use-case lui-même utilise le `db` singleton de prod (transaction interne).
let sql: postgres.Sql;
let useCase: ChangePasswordUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- test fixture, pré-condition de runtime
    throw new Error("DATABASE_URL absent — vérifier app/.env");
  }
  sql = postgres(url, { max: 1 });
  // Use-case construit avec les repos par défaut (utilisent le db singleton).
  useCase = new ChangePasswordUseCase(
    new UserRepositoryPg(),
    new AuditRepositoryPg(),
    passwordHasher,
  );
});

afterEach(async () => {
  // Cleanup post-test : TRUNCATE (le use-case a commit sa transaction interne
  // sur le singleton `db`, échappant à un éventuel BEGIN/ROLLBACK externe).
  // Re-seed SYSTEM pour préserver l'invariant cross-fichiers.
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
  const hash = await passwordHasher.hash(TEST_OLD_PASSWORD);
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
    expect(await passwordHasher.verify(TEST_NEW_PASSWORD, userRows[0]?.password_hash ?? "")).toBe(
      true,
    );
    expect(await passwordHasher.verify(TEST_OLD_PASSWORD, userRows[0]?.password_hash ?? "")).toBe(
      false,
    );

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
    expect(await passwordHasher.verify(TEST_OLD_PASSWORD, userRows[0]?.password_hash ?? "")).toBe(
      true,
    );

    const auditRows = await sql<{ count: string }[]>`
      SELECT count(*)::text as count FROM lic_audit_log WHERE entity_id = ${TEST_USER_ID}
    `;
    expect(auditRows[0]?.count).toBe("0");
  });
});
