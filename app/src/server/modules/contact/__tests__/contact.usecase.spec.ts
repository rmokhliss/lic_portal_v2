// ==============================================================================
// LIC v2 — Test d'intégration module contact (Phase 4 étape 4.C)
//
// Pattern TRUNCATE+reseed R-32. Couvre create / update / delete (hard).
// Le type_contact_code utilise les 3 valeurs bootstrap (ACHAT/FACTURATION/
// TECHNIQUE) seedées en migration 0003.
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { ClientRepositoryPg } from "../../client/adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../../client/application/create-client.usecase";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { ContactRepositoryPg } from "../adapters/postgres/contact.repository.pg";
import { CreateContactUseCase } from "../application/create-contact.usecase";
import { DeleteContactUseCase } from "../application/delete-contact.usecase";
import { UpdateContactUseCase } from "../application/update-contact.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClientUseCase: CreateClientUseCase;
let createUseCase: CreateContactUseCase;
let updateUseCase: UpdateContactUseCase;
let deleteUseCase: DeleteContactUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const clientRepo = new ClientRepositoryPg();
  const contactRepo = new ContactRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  createClientUseCase = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  createUseCase = new CreateContactUseCase(contactRepo, userRepo, auditRepo);
  updateUseCase = new UpdateContactUseCase(contactRepo, userRepo, auditRepo);
  deleteUseCase = new DeleteContactUseCase(contactRepo, userRepo, auditRepo);
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

async function seedSiege(): Promise<string> {
  await seedActor();
  const result = await createClientUseCase.execute(
    { codeClient: "TST", raisonSociale: "Test Bank" },
    ACTOR_ID,
  );
  return result.siegeEntiteId;
}

describe("CreateContactUseCase", () => {
  it("INSERT + audit CONTACT_CREATED", async () => {
    const siegeId = await seedSiege();
    const result = await createUseCase.execute(
      {
        entiteId: siegeId,
        typeContactCode: "ACHAT",
        nom: "DUPONT",
        prenom: "Alice",
        email: "alice@bank.ma",
      },
      ACTOR_ID,
    );
    expect(result.contact.nom).toBe("DUPONT");
    expect(result.contact.typeContactCode).toBe("ACHAT");

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${result.contact.id}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("CONTACT_CREATED");
  });

  it("rejette email invalide — SPX-LIC-734", async () => {
    const siegeId = await seedSiege();
    await expect(
      createUseCase.execute(
        { entiteId: siegeId, typeContactCode: "ACHAT", nom: "X", email: "not-an-email" },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-734" });
  });
});

describe("UpdateContactUseCase", () => {
  it("UPDATE + audit CONTACT_UPDATED", async () => {
    const siegeId = await seedSiege();
    const created = await createUseCase.execute(
      { entiteId: siegeId, typeContactCode: "ACHAT", nom: "DUPONT" },
      ACTOR_ID,
    );
    await updateUseCase.execute(
      { contactId: created.contact.id, typeContactCode: "FACTURATION" },
      ACTOR_ID,
    );

    const rows = await sql<{ type_contact_code: string }[]>`
      SELECT type_contact_code FROM lic_contacts_clients WHERE id = ${created.contact.id}
    `;
    expect(rows[0]?.type_contact_code).toBe("FACTURATION");

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${created.contact.id} AND action = 'CONTACT_UPDATED'
    `;
    expect(audit).toHaveLength(1);
  });
});

describe("DeleteContactUseCase (hard delete)", () => {
  it("DELETE BD + audit CONTACT_DELETED avec snapshot beforeData", async () => {
    const siegeId = await seedSiege();
    const created = await createUseCase.execute(
      { entiteId: siegeId, typeContactCode: "TECHNIQUE", nom: "TECH-CONTACT" },
      ACTOR_ID,
    );
    await deleteUseCase.execute({ contactId: created.contact.id }, ACTOR_ID);

    const rows = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM lic_contacts_clients WHERE id = ${created.contact.id}
    `;
    expect(rows[0]?.count).toBe("0");

    // Snapshot complet préservé en before_data
    const audit = await sql<{ action: string; before_data: { nom: string } | null }[]>`
      SELECT action, before_data FROM lic_audit_log
      WHERE entity_id = ${created.contact.id} AND action = 'CONTACT_DELETED'
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.before_data?.nom).toBe("TECH-CONTACT");
  });

  it("throw NotFound si contactId inexistant — SPX-LIC-733", async () => {
    await seedActor();
    await expect(
      deleteUseCase.execute({ contactId: "01928c8e-9999-9999-9999-999999999999" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-733" });
  });
});
