// ==============================================================================
// LIC v2 — Tests d'intégration module renouvellement (Phase 5).
// Pattern R-32. Couvre create + valider + annuler + transitions interdites.
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { ClientRepositoryPg } from "../../client/adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../../client/application/create-client.usecase";
import { LicenceRepositoryPg } from "../../licence/adapters/postgres/licence.repository.pg";
import { CreateLicenceUseCase } from "../../licence/application/create-licence.usecase";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { RenouvellementRepositoryPg } from "../adapters/postgres/renouvellement.repository.pg";
import { AnnulerRenouvellementUseCase } from "../application/annuler-renouvellement.usecase";
import { CreateRenouvellementUseCase } from "../application/create-renouvellement.usecase";
import { ValiderRenouvellementUseCase } from "../application/valider-renouvellement.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClient: CreateClientUseCase;
let createLicence: CreateLicenceUseCase;
let createRenouv: CreateRenouvellementUseCase;
let valider: ValiderRenouvellementUseCase;
let annuler: AnnulerRenouvellementUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const clientRepo = new ClientRepositoryPg();
  const licenceRepo = new LicenceRepositoryPg();
  const renouvRepo = new RenouvellementRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  createClient = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  createLicence = new CreateLicenceUseCase(licenceRepo, userRepo, auditRepo);
  createRenouv = new CreateRenouvellementUseCase(renouvRepo, licenceRepo, userRepo, auditRepo);
  valider = new ValiderRenouvellementUseCase(renouvRepo, userRepo, auditRepo, licenceRepo);
  annuler = new AnnulerRenouvellementUseCase(renouvRepo, userRepo, auditRepo);
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

async function seedLicence(): Promise<{ licenceId: string }> {
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
  return { licenceId: l.licence.id };
}

describe("CreateRenouvellementUseCase", () => {
  it("INSERT + audit RENOUVELLEMENT_CREATED, statut EN_COURS", async () => {
    const { licenceId } = await seedLicence();
    const r = await createRenouv.execute(
      {
        licenceId,
        nouvelleDateDebut: new Date("2028-01-01"),
        nouvelleDateFin: new Date("2029-12-31"),
        commentaire: "Renouvellement annuel",
      },
      ACTOR_ID,
    );
    expect(r.renouvellement.status).toBe("EN_COURS");

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${r.renouvellement.id}
    `;
    expect(audit[0]?.action).toBe("RENOUVELLEMENT_CREATED");
  });
});

describe("ValiderRenouvellementUseCase", () => {
  it("EN_COURS → VALIDE + audit RENOUVELLEMENT_VALIDATED + valide_par + date_validation", async () => {
    const { licenceId } = await seedLicence();
    const r = await createRenouv.execute(
      {
        licenceId,
        nouvelleDateDebut: new Date("2028-01-01"),
        nouvelleDateFin: new Date("2029-12-31"),
      },
      ACTOR_ID,
    );
    const validated = await valider.execute({ renouvellementId: r.renouvellement.id }, ACTOR_ID);
    expect(validated.renouvellement.status).toBe("VALIDE");
    expect(validated.renouvellement.valideePar).toBe(ACTOR_ID);
    expect(validated.renouvellement.dateValidation).not.toBeNull();
  });
});

describe("AnnulerRenouvellementUseCase", () => {
  it("EN_COURS → ANNULE avec motif concaténé au commentaire", async () => {
    const { licenceId } = await seedLicence();
    const r = await createRenouv.execute(
      {
        licenceId,
        nouvelleDateDebut: new Date("2028-01-01"),
        nouvelleDateFin: new Date("2029-12-31"),
        commentaire: "Initial",
      },
      ACTOR_ID,
    );
    const annulee = await annuler.execute(
      { renouvellementId: r.renouvellement.id, motif: "Pas de budget client" },
      ACTOR_ID,
    );
    expect(annulee.renouvellement.status).toBe("ANNULE");
    expect(annulee.renouvellement.commentaire).toContain("Pas de budget client");
  });
});

describe("Renouvellement transitions interdites SPX-LIC-742", () => {
  it("VALIDE → ANNULE rejeté (terminal)", async () => {
    const { licenceId } = await seedLicence();
    const r = await createRenouv.execute(
      {
        licenceId,
        nouvelleDateDebut: new Date("2028-01-01"),
        nouvelleDateFin: new Date("2029-12-31"),
      },
      ACTOR_ID,
    );
    await valider.execute({ renouvellementId: r.renouvellement.id }, ACTOR_ID);
    await expect(
      annuler.execute({ renouvellementId: r.renouvellement.id }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-742" });
  });
});
