// ==============================================================================
// LIC v2 — Test d'intégration CreateUserUseCase (Phase 2.B.bis EC-08)
//
// Pattern TRUNCATE+reseed (R-28) car le use-case ouvre db.transaction() interne.
// 4 cas couverts : nominal, conflit matricule, conflit email, validation domaine.
// ==============================================================================

import bcryptjs from "bcryptjs";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { UserRepositoryPg } from "../adapters/postgres/user.repository.pg";
import { CreateUserUseCase } from "../application/create-user.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let useCase: CreateUserUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition runtime test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  useCase = new CreateUserUseCase(new UserRepositoryPg(), new AuditRepositoryPg());
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

async function seedActor(): Promise<void> {
  await sql`
    INSERT INTO lic_users (
      id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at
    ) VALUES (
      ${ACTOR_ID}, 'MAT-001', 'ADMIN', 'Système', 'admin@s2m.ma',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', true, NOW(), NOW()
    )
  `;
}

describe("CreateUserUseCase — cas nominal", () => {
  it("INSERT user + retourne password généré + audit USER_CREATED", async () => {
    await seedActor();

    const result = await useCase.execute(
      {
        matricule: "MAT-042",
        nom: "DUPONT",
        prenom: "Alice",
        email: "alice@s2m.ma",
        role: "USER",
      },
      ACTOR_ID,
    );

    expect(result.user.matricule).toBe("MAT-042");
    expect(result.user.actif).toBe(true);
    expect(result.user.mustChangePassword).toBe(true);
    expect(result.generatedPassword).toHaveLength(16);

    // Hash bcrypt valide en BD
    const rows = await sql<{ password_hash: string; must_change_password: boolean }[]>`
      SELECT password_hash, must_change_password FROM lic_users WHERE matricule = 'MAT-042'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.must_change_password).toBe(true);
    expect(await bcryptjs.compare(result.generatedPassword, rows[0]?.password_hash ?? "")).toBe(
      true,
    );

    // Audit USER_CREATED dans même transaction
    const audit = await sql<{ action: string; user_display: string | null }[]>`
      SELECT action, user_display FROM lic_audit_log WHERE entity_id = ${result.user.id}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("USER_CREATED");
    expect(audit[0]?.user_display).toBe("Système ADMIN (MAT-001)");
  });
});

describe("CreateUserUseCase — conflits unicité (SPX-LIC-721)", () => {
  it("rejette matricule déjà utilisé", async () => {
    await seedActor();
    await useCase.execute(
      { matricule: "MAT-042", nom: "DUPONT", prenom: "Alice", email: "a@s2m.ma", role: "USER" },
      ACTOR_ID,
    );

    await expect(
      useCase.execute(
        {
          matricule: "MAT-042",
          nom: "MARTIN",
          prenom: "Bob",
          email: "b@s2m.ma",
          role: "USER",
        },
        ACTOR_ID,
      ),
    ).rejects.toThrow(/SPX-LIC-721|matricule/i);
  });

  it("rejette email déjà utilisé", async () => {
    await seedActor();
    await useCase.execute(
      {
        matricule: "MAT-100",
        nom: "DUPONT",
        prenom: "Alice",
        email: "shared@s2m.ma",
        role: "USER",
      },
      ACTOR_ID,
    );

    await expect(
      useCase.execute(
        {
          matricule: "MAT-101",
          nom: "MARTIN",
          prenom: "Bob",
          email: "shared@s2m.ma",
          role: "USER",
        },
        ACTOR_ID,
      ),
    ).rejects.toThrow(/SPX-LIC-721|email/i);
  });
});

describe("CreateUserUseCase — validation domaine (SPX-LIC-722)", () => {
  it("rejette matricule au format invalide", async () => {
    await seedActor();
    await expect(
      useCase.execute(
        { matricule: "WRONG-FORMAT", nom: "X", prenom: "Y", email: "x@s2m.ma", role: "USER" },
        ACTOR_ID,
      ),
    ).rejects.toThrow(/SPX-LIC-722|matricule/i);
  });
});
