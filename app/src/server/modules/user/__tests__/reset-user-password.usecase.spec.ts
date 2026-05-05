// ==============================================================================
// LIC v2 — Test d'intégration ResetUserPasswordUseCase (Phase 2.B.bis EC-08)
//
// Pattern TRUNCATE+reseed (R-28).
// Cas couverts : reset hash + must_change=true + token_version+1, audit
// USER_PASSWORD_RESET_BY_ADMIN, NotFound (SPX-LIC-720).
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { MockPasswordHasher } from "../adapters/mock/password-hasher.mock";
import { UserRepositoryPg } from "../adapters/postgres/user.repository.pg";
import { ResetUserPasswordUseCase } from "../application/reset-user-password.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";
const TARGET_ID = "01928c8e-eeee-ffff-aaaa-bbbb00000002";
const OLD_HASH = "$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C";

// Phase 15 — MockPasswordHasher pour gain perf (vs bcrypt cost 10).
const passwordHasher = new MockPasswordHasher();

let sql: postgres.Sql;
let useCase: ResetUserPasswordUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  useCase = new ResetUserPasswordUseCase(
    new UserRepositoryPg(),
    new AuditRepositoryPg(),
    passwordHasher,
  );
});

afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_users CASCADE`;
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES (${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
      ${OLD_HASH}, false, 'SADMIN', false, NOW(), NOW())
  `;
});

afterAll(async () => {
  await sql.end();
});

async function seedActorAndTarget(): Promise<void> {
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, token_version, role, actif, created_at, updated_at)
    VALUES
      (${ACTOR_ID}, 'MAT-001', 'ADMIN', 'Système', 'admin@s2m.ma',
       ${OLD_HASH}, false, 0, 'SADMIN', true, NOW(), NOW()),
      (${TARGET_ID}, 'MAT-042', 'DUPONT', 'Alice', 'alice@s2m.ma',
       ${OLD_HASH}, false, 5, 'USER', true, NOW(), NOW())
  `;
}

describe("ResetUserPasswordUseCase — cas nominal", () => {
  it("hash change + must_change=true + token_version+1 + audit", async () => {
    await seedActorAndTarget();
    const result = await useCase.execute({ userId: TARGET_ID }, ACTOR_ID);

    expect(result.newPassword).toHaveLength(16);

    const rows = await sql<
      { password_hash: string; must_change_password: boolean; token_version: number }[]
    >`
      SELECT password_hash, must_change_password, token_version
      FROM lic_users WHERE id = ${TARGET_ID}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.must_change_password).toBe(true);
    expect(rows[0]?.token_version).toBe(6);
    expect(rows[0]?.password_hash).not.toBe(OLD_HASH);
    expect(await passwordHasher.verify(result.newPassword, rows[0]?.password_hash ?? "")).toBe(
      true,
    );

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${TARGET_ID}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("USER_PASSWORD_RESET_BY_ADMIN");
  });
});

describe("ResetUserPasswordUseCase — NotFound (SPX-LIC-720)", () => {
  it("throw si userId inexistant", async () => {
    await seedActorAndTarget();
    await expect(
      useCase.execute({ userId: "01928c8e-9999-9999-9999-999999999999" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-720" });
  });
});
