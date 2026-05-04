// ==============================================================================
// LIC v2 — Test d'intégration ChangeLicenceStatusUseCase (Phase 5).
// EXPIRE terminal (canTransition).
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { ClientRepositoryPg } from "../../client/adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../../client/application/create-client.usecase";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { LicenceRepositoryPg } from "../adapters/postgres/licence.repository.pg";
import { ChangeLicenceStatusUseCase } from "../application/change-licence-status.usecase";
import { CreateLicenceUseCase } from "../application/create-licence.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClient: CreateClientUseCase;
let createLicence: CreateLicenceUseCase;
let useCase: ChangeLicenceStatusUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const clientRepo = new ClientRepositoryPg();
  const licenceRepo = new LicenceRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  createClient = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  createLicence = new CreateLicenceUseCase(licenceRepo, userRepo, auditRepo);
  useCase = new ChangeLicenceStatusUseCase(licenceRepo, userRepo, auditRepo);
});

afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_renouvellements, lic_licences, lic_contacts_clients, lic_entites, lic_clients, lic_users CASCADE`;
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

async function seedLicenceWithStatut(
  statut: "ACTIF" | "INACTIF" | "SUSPENDU" | "EXPIRE" = "ACTIF",
): Promise<{ licenceId: string; version: number }> {
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES (${ACTOR_ID}, 'MAT-001', 'ADMIN', 'Système', 'admin@s2m.ma',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', true, NOW(), NOW())
  `;
  const c = await createClient.execute({ codeClient: "TST", raisonSociale: "Test" }, ACTOR_ID);
  const l = await createLicence.execute(
    {
      clientId: c.client.id,
      entiteId: c.siegeEntiteId,
      dateDebut: new Date("2026-01-01"),
      dateFin: new Date("2027-12-31"),
    },
    ACTOR_ID,
  );
  // Force le statut via UPDATE direct (bypass règles transitions pour fixture)
  if (statut !== "ACTIF") {
    await sql`UPDATE lic_licences SET status = ${statut}::licence_status_enum WHERE id = ${l.licence.id}`;
  }
  return { licenceId: l.licence.id, version: l.licence.version };
}

describe("ChangeLicenceStatusUseCase — transitions valides", () => {
  it("ACTIF → SUSPENDU émet LICENCE_SUSPENDED", async () => {
    const seed = await seedLicenceWithStatut("ACTIF");
    await useCase.execute(
      { licenceId: seed.licenceId, expectedVersion: seed.version, newStatus: "SUSPENDU" },
      ACTOR_ID,
    );
    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${seed.licenceId} AND action LIKE 'LICENCE_%'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(audit[0]?.action).toBe("LICENCE_SUSPENDED");
  });

  it("ACTIF → EXPIRE émet LICENCE_EXPIRED", async () => {
    const seed = await seedLicenceWithStatut("ACTIF");
    await useCase.execute(
      { licenceId: seed.licenceId, expectedVersion: seed.version, newStatus: "EXPIRE" },
      ACTOR_ID,
    );
    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${seed.licenceId} AND action LIKE 'LICENCE_%'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(audit[0]?.action).toBe("LICENCE_EXPIRED");
  });
});

describe("ChangeLicenceStatusUseCase — EXPIRE terminal SPX-LIC-738", () => {
  it("rejette toute transition sortante depuis EXPIRE", async () => {
    const seed = await seedLicenceWithStatut("EXPIRE");
    await expect(
      useCase.execute(
        { licenceId: seed.licenceId, expectedVersion: seed.version, newStatus: "ACTIF" },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-738" });
  });
});
