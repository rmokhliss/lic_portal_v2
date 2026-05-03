// ==============================================================================
// LIC v2 — Test d'intégration ToggleUserActiveUseCase (Phase 2.B.bis EC-08)
//
// Pattern TRUNCATE+reseed (R-28).
// Cas couverts : true→false (USER_DEACTIVATED), false→true (USER_ACTIVATED),
// auto-désactivation interdite (SPX-LIC-723), NotFound (SPX-LIC-720).
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { UserRepositoryPg } from "../adapters/postgres/user.repository.pg";
import { ToggleUserActiveUseCase } from "../application/toggle-user-active.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";
const TARGET_ID = "01928c8e-eeee-ffff-aaaa-bbbb00000002";

let sql: postgres.Sql;
let useCase: ToggleUserActiveUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  useCase = new ToggleUserActiveUseCase(new UserRepositoryPg(), new AuditRepositoryPg());
});

afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_users CASCADE`;
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

async function seedActorAndTarget(targetActif = true): Promise<void> {
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES
      (${ACTOR_ID}, 'MAT-001', 'ADMIN', 'Système', 'admin@s2m.ma',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'SADMIN', true, NOW(), NOW()),
      (${TARGET_ID}, 'MAT-042', 'DUPONT', 'Alice', 'alice@s2m.ma',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'USER', ${targetActif}, NOW(), NOW())
  `;
}

describe("ToggleUserActiveUseCase — désactivation", () => {
  it("true → false : updateActif + audit USER_DEACTIVATED", async () => {
    await seedActorAndTarget(true);
    const result = await useCase.execute({ userId: TARGET_ID }, ACTOR_ID);
    expect(result.user.actif).toBe(false);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${TARGET_ID}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("USER_DEACTIVATED");
  });
});

describe("ToggleUserActiveUseCase — réactivation", () => {
  it("false → true : updateActif + audit USER_ACTIVATED", async () => {
    await seedActorAndTarget(false);
    const result = await useCase.execute({ userId: TARGET_ID }, ACTOR_ID);
    expect(result.user.actif).toBe(true);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${TARGET_ID}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("USER_ACTIVATED");
  });
});

describe("ToggleUserActiveUseCase — règle auto-désactivation (SPX-LIC-723)", () => {
  it("rejette quand actor=target et tentative de désactivation", async () => {
    await seedActorAndTarget(true);
    await expect(useCase.execute({ userId: ACTOR_ID }, ACTOR_ID)).rejects.toThrow(
      /SPX-LIC-723|désactiver/i,
    );

    // BD inchangée (rollback de la transaction)
    const rows = await sql<{ actif: boolean }[]>`
      SELECT actif FROM lic_users WHERE id = ${ACTOR_ID}
    `;
    expect(rows[0]?.actif).toBe(true);
  });
});

describe("ToggleUserActiveUseCase — NotFound (SPX-LIC-720)", () => {
  it("throw si userId inexistant", async () => {
    await seedActorAndTarget(true);
    await expect(
      useCase.execute({ userId: "01928c8e-9999-9999-9999-999999999999" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-720" });
  });
});
