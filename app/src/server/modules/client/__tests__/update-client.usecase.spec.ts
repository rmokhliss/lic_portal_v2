// ==============================================================================
// LIC v2 — Test d'intégration UpdateClientUseCase (Phase 4 étape 4.B)
// Pattern TRUNCATE+reseed (R-28). Cas : nominal, version conflict (L4),
// no-op patch vide, NotFound.
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { ClientRepositoryPg } from "../adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../application/create-client.usecase";
import { UpdateClientUseCase } from "../application/update-client.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createUseCase: CreateClientUseCase;
let useCase: UpdateClientUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const clientRepo = new ClientRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  createUseCase = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  useCase = new UpdateClientUseCase(clientRepo, userRepo, auditRepo);
});

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

async function seedClient(): Promise<{ id: string; version: number }> {
  await seedActor();
  const created = await createUseCase.execute(
    { codeClient: "TST", raisonSociale: "Test Bank" },
    ACTOR_ID,
  );
  return { id: created.client.id, version: created.client.version };
}

describe("UpdateClientUseCase — patch profil", () => {
  it("UPDATE + bump version + audit CLIENT_UPDATED", async () => {
    const seed = await seedClient();
    const result = await useCase.execute(
      { clientId: seed.id, expectedVersion: seed.version, raisonSociale: "Test Bank Renamed" },
      ACTOR_ID,
    );
    expect(result.client.raisonSociale).toBe("Test Bank Renamed");
    expect(result.client.version).toBe(seed.version + 1);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${seed.id} AND action = 'CLIENT_UPDATED'
    `;
    expect(audit).toHaveLength(1);
  });
});

describe("UpdateClientUseCase — version conflict (SPX-LIC-728, règle L4)", () => {
  it("rejette si expectedVersion ≠ version BD (modif concurrente)", async () => {
    const seed = await seedClient();
    // 1er update OK : version 0 → 1
    await useCase.execute(
      { clientId: seed.id, expectedVersion: 0, raisonSociale: "First Edit" },
      ACTOR_ID,
    );
    // 2e update avec expectedVersion=0 (stale) → conflict 728
    await expect(
      useCase.execute(
        { clientId: seed.id, expectedVersion: 0, raisonSociale: "Stale Edit" },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-728" });
  });
});

describe("UpdateClientUseCase — no-op et NotFound", () => {
  it("patch vide = no-op (pas d'audit)", async () => {
    const seed = await seedClient();
    const result = await useCase.execute(
      { clientId: seed.id, expectedVersion: seed.version },
      ACTOR_ID,
    );
    // Version inchangée + pas d'audit CLIENT_UPDATED
    expect(result.client.version).toBe(seed.version);
    const audit = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM lic_audit_log WHERE entity_id = ${seed.id} AND action = 'CLIENT_UPDATED'
    `;
    expect(audit[0]?.count).toBe("0");
  });

  it("throw SPX-LIC-724 si clientId inexistant", async () => {
    await seedActor();
    await expect(
      useCase.execute(
        {
          clientId: "01928c8e-9999-9999-9999-999999999999",
          expectedVersion: 0,
          raisonSociale: "X",
        },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-724" });
  });
});
