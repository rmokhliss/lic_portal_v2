// ==============================================================================
// LIC v2 — Test d'intégration UpdateLicenceUseCase (Phase 5).
// Cas : nominal, version conflict L4 (728→739), no-op, NotFound.
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
import { CreateLicenceUseCase } from "../application/create-licence.usecase";
import { UpdateLicenceUseCase } from "../application/update-licence.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClient: CreateClientUseCase;
let createLicence: CreateLicenceUseCase;
let useCase: UpdateLicenceUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const clientRepo = new ClientRepositoryPg();
  const licenceRepo = new LicenceRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  createClient = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  createLicence = new CreateLicenceUseCase(licenceRepo, userRepo, auditRepo);
  useCase = new UpdateLicenceUseCase(licenceRepo, userRepo, auditRepo);
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

async function seedActor(): Promise<void> {
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES (${ACTOR_ID}, 'MAT-001', 'ADMIN', 'Système', 'admin@s2m.ma',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', true, NOW(), NOW())
  `;
}

async function seedLicence(): Promise<{ licenceId: string; version: number }> {
  await seedActor();
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
  return { licenceId: l.licence.id, version: l.licence.version };
}

describe("UpdateLicenceUseCase", () => {
  it("UPDATE commentaire + bump version + audit LICENCE_UPDATED", async () => {
    const seed = await seedLicence();
    const result = await useCase.execute(
      {
        licenceId: seed.licenceId,
        expectedVersion: seed.version,
        commentaire: "Nouveau commentaire",
      },
      ACTOR_ID,
    );
    expect(result.licence.commentaire).toBe("Nouveau commentaire");
    expect(result.licence.version).toBe(seed.version + 1);
  });

  it("rejette version conflict — SPX-LIC-739 (L4)", async () => {
    const seed = await seedLicence();
    await useCase.execute(
      { licenceId: seed.licenceId, expectedVersion: 0, commentaire: "First" },
      ACTOR_ID,
    );
    await expect(
      useCase.execute(
        { licenceId: seed.licenceId, expectedVersion: 0, commentaire: "Stale" },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-739" });
  });

  it("throw NotFound — SPX-LIC-735", async () => {
    await seedActor();
    await expect(
      useCase.execute(
        {
          licenceId: "01928c8e-9999-9999-9999-999999999999",
          expectedVersion: 0,
          commentaire: "X",
        },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-735" });
  });
});
