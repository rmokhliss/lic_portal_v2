// ==============================================================================
// LIC v2 — Test d'intégration ChangeClientStatusUseCase (Phase 4 étape 4.B)
// Pattern TRUNCATE+reseed (R-28). Cas : transitions valides + RESILIE terminal.
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { ClientRepositoryPg } from "../adapters/postgres/client.repository.pg";
import { ChangeClientStatusUseCase } from "../application/change-client-status.usecase";
import { CreateClientUseCase } from "../application/create-client.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createUseCase: CreateClientUseCase;
let useCase: ChangeClientStatusUseCase;

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
  useCase = new ChangeClientStatusUseCase(clientRepo, userRepo, auditRepo);
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

async function seedClient(
  statut: "PROSPECT" | "ACTIF" | "SUSPENDU" | "RESILIE" = "ACTIF",
): Promise<{
  id: string;
  version: number;
}> {
  await seedActor();
  const created = await createUseCase.execute(
    { codeClient: "TST", raisonSociale: "Test", statutClient: statut },
    ACTOR_ID,
  );
  return { id: created.client.id, version: created.client.version };
}

describe("ChangeClientStatusUseCase — transitions valides", () => {
  it("ACTIF → SUSPENDU émet CLIENT_SUSPENDED", async () => {
    const seed = await seedClient("ACTIF");
    const result = await useCase.execute(
      { clientId: seed.id, expectedVersion: seed.version, newStatus: "SUSPENDU" },
      ACTOR_ID,
    );
    expect(result.client.statutClient).toBe("SUSPENDU");

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${seed.id} AND action LIKE 'CLIENT_%'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(audit[0]?.action).toBe("CLIENT_SUSPENDED");
  });

  it("PROSPECT → ACTIF émet CLIENT_ACTIVATED", async () => {
    const seed = await seedClient("PROSPECT");
    await useCase.execute(
      { clientId: seed.id, expectedVersion: seed.version, newStatus: "ACTIF" },
      ACTOR_ID,
    );
    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${seed.id} AND action LIKE 'CLIENT_%'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(audit[0]?.action).toBe("CLIENT_ACTIVATED");
  });
});

describe("ChangeClientStatusUseCase — RESILIE terminal (SPX-LIC-727)", () => {
  it("rejette toute transition sortante depuis RESILIE", async () => {
    const seed = await seedClient("RESILIE");
    await expect(
      useCase.execute(
        { clientId: seed.id, expectedVersion: seed.version, newStatus: "ACTIF" },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-727" });
  });

  it("rejette transition vers le même statut (no-op explicite)", async () => {
    const seed = await seedClient("ACTIF");
    await expect(
      useCase.execute(
        { clientId: seed.id, expectedVersion: seed.version, newStatus: "ACTIF" },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-727" });
  });

  it("ACTIF → RESILIE émet CLIENT_TERMINATED", async () => {
    const seed = await seedClient("ACTIF");
    await useCase.execute(
      { clientId: seed.id, expectedVersion: seed.version, newStatus: "RESILIE" },
      ACTOR_ID,
    );
    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${seed.id} AND action LIKE 'CLIENT_%'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(audit[0]?.action).toBe("CLIENT_TERMINATED");
  });
});
