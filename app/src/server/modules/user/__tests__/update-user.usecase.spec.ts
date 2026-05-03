// ==============================================================================
// LIC v2 — Test d'intégration UpdateUserUseCase (Phase 2.B.bis EC-08)
//
// Pattern TRUNCATE+reseed (R-28).
// Cas couverts : USER_UPDATED (nom/prénom), USER_ROLE_CHANGED, no-op patch
// vide, NotFound.
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { UserRepositoryPg } from "../adapters/postgres/user.repository.pg";
import { UpdateUserUseCase } from "../application/update-user.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";
const TARGET_ID = "01928c8e-eeee-ffff-aaaa-bbbb00000002";

let sql: postgres.Sql;
let useCase: UpdateUserUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  useCase = new UpdateUserUseCase(new UserRepositoryPg(), new AuditRepositoryPg());
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

async function seedActorAndTarget(): Promise<void> {
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES
      (${ACTOR_ID}, 'MAT-001', 'ADMIN', 'Système', 'admin@s2m.ma',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'SADMIN', true, NOW(), NOW()),
      (${TARGET_ID}, 'MAT-042', 'DUPONT', 'Alice', 'alice@s2m.ma',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'USER', true, NOW(), NOW())
  `;
}

describe("UpdateUserUseCase — patch nom/prenom", () => {
  it("UPDATE + audit USER_UPDATED quand role inchangé", async () => {
    await seedActorAndTarget();
    const result = await useCase.execute({ userId: TARGET_ID, prenom: "Alicia" }, ACTOR_ID);
    expect(result.user.prenom).toBe("Alicia");
    expect(result.user.nom).toBe("DUPONT");

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${TARGET_ID}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("USER_UPDATED");
  });
});

describe("UpdateUserUseCase — patch role", () => {
  it("UPDATE + audit USER_ROLE_CHANGED quand role change", async () => {
    await seedActorAndTarget();
    const result = await useCase.execute({ userId: TARGET_ID, role: "ADMIN" }, ACTOR_ID);
    expect(result.user.role).toBe("ADMIN");

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${TARGET_ID}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("USER_ROLE_CHANGED");
  });

  it("USER_ROLE_CHANGED prend le pas sur USER_UPDATED si role + nom changent", async () => {
    await seedActorAndTarget();
    await useCase.execute({ userId: TARGET_ID, role: "ADMIN", nom: "DUPONT-MARTIN" }, ACTOR_ID);
    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${TARGET_ID}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("USER_ROLE_CHANGED");
  });
});

describe("UpdateUserUseCase — no-op et erreurs", () => {
  it("patch vide = no-op (pas d'audit log)", async () => {
    await seedActorAndTarget();
    await useCase.execute({ userId: TARGET_ID }, ACTOR_ID);
    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${TARGET_ID}
    `;
    expect(audit).toHaveLength(0);
  });

  it("throw NotFoundError SPX-LIC-720 si userId inexistant", async () => {
    await seedActorAndTarget();
    await expect(
      useCase.execute({ userId: "01928c8e-9999-9999-9999-999999999999", nom: "X" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-720" });
  });
});
