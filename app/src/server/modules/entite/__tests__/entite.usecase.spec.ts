// ==============================================================================
// LIC v2 — Test d'intégration module entite (Phase 4 étape 4.C)
//
// Pattern TRUNCATE+reseed R-32 : afterEach reseede SYS-000 SEUL, helper
// seedActor() inline. CASCADE depuis lic_clients → lic_entites → contacts.
//
// Couvre les 3 use-cases mutateurs (create/update/toggle) — get + list sont
// exercés indirectement par les autres tests (assertion BD via SQL direct).
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { ClientRepositoryPg } from "../../client/adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../../client/application/create-client.usecase";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { EntiteRepositoryPg } from "../adapters/postgres/entite.repository.pg";
import { CreateEntiteUseCase } from "../application/create-entite.usecase";
import { ToggleEntiteActiveUseCase } from "../application/toggle-entite-active.usecase";
import { UpdateEntiteUseCase } from "../application/update-entite.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClientUseCase: CreateClientUseCase;
let createUseCase: CreateEntiteUseCase;
let updateUseCase: UpdateEntiteUseCase;
let toggleUseCase: ToggleEntiteActiveUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const clientRepo = new ClientRepositoryPg();
  const entiteRepo = new EntiteRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  createClientUseCase = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  createUseCase = new CreateEntiteUseCase(entiteRepo, userRepo, auditRepo);
  updateUseCase = new UpdateEntiteUseCase(entiteRepo, userRepo, auditRepo);
  toggleUseCase = new ToggleEntiteActiveUseCase(entiteRepo, userRepo, auditRepo);
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

async function seedClientWithSiege(): Promise<{ clientId: string; siegeId: string }> {
  await seedActor();
  const result = await createClientUseCase.execute(
    { codeClient: "TST", raisonSociale: "Test Bank" },
    ACTOR_ID,
  );
  return { clientId: result.client.id, siegeId: result.siegeEntiteId };
}

describe("CreateEntiteUseCase", () => {
  it("INSERT + audit ENTITE_CREATED", async () => {
    const { clientId } = await seedClientWithSiege();
    const result = await createUseCase.execute({ clientId, nom: "Filiale Casablanca" }, ACTOR_ID);
    expect(result.entite.nom).toBe("Filiale Casablanca");
    expect(result.entite.actif).toBe(true);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${result.entite.id}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("ENTITE_CREATED");
  });

  it("rejette doublon (clientId, nom) — SPX-LIC-731", async () => {
    const { clientId } = await seedClientWithSiege();
    // "Test Bank" déjà créée comme Siège
    await expect(
      createUseCase.execute({ clientId, nom: "Test Bank" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-731" });
  });
});

describe("UpdateEntiteUseCase", () => {
  it("UPDATE nom + audit ENTITE_UPDATED", async () => {
    const { siegeId } = await seedClientWithSiege();
    await updateUseCase.execute({ entiteId: siegeId, nom: "Nouveau Nom" }, ACTOR_ID);
    const rows = await sql<{ nom: string }[]>`
      SELECT nom FROM lic_entites WHERE id = ${siegeId}
    `;
    expect(rows[0]?.nom).toBe("Nouveau Nom");

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${siegeId} AND action = 'ENTITE_UPDATED'
    `;
    expect(audit).toHaveLength(1);
  });

  it("rejette renommage en doublon (clientId, nom) — SPX-LIC-731", async () => {
    const { clientId, siegeId } = await seedClientWithSiege();
    await createUseCase.execute({ clientId, nom: "Filiale 1" }, ACTOR_ID);
    await expect(
      updateUseCase.execute({ entiteId: siegeId, nom: "Filiale 1" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-731" });
  });

  it("throw NotFound si entiteId inexistant — SPX-LIC-730", async () => {
    await seedActor();
    await expect(
      updateUseCase.execute(
        { entiteId: "01928c8e-9999-9999-9999-999999999999", nom: "X" },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-730" });
  });
});

describe("ToggleEntiteActiveUseCase", () => {
  it("toggle true→false : audit ENTITE_DEACTIVATED", async () => {
    const { siegeId } = await seedClientWithSiege();
    const result = await toggleUseCase.execute({ entiteId: siegeId }, ACTOR_ID);
    expect(result.entite.actif).toBe(false);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${siegeId} AND action LIKE 'ENTITE_%CTIVATED'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(audit[0]?.action).toBe("ENTITE_DEACTIVATED");
  });
});
