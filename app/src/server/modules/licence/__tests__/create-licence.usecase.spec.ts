// ==============================================================================
// LIC v2 — Test d'intégration CreateLicenceUseCase (Phase 5)
// Pattern TRUNCATE+reseed R-32. Audit dans tx (L3). Reference auto-générée.
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

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClient: CreateClientUseCase;
let useCase: CreateLicenceUseCase;

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
  useCase = new CreateLicenceUseCase(licenceRepo, userRepo, auditRepo);
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

async function seedClientWithSiege(): Promise<{ clientId: string; entiteId: string }> {
  await seedActor();
  const c = await createClient.execute({ codeClient: "TST", raisonSociale: "Test Bank" }, ACTOR_ID);
  return { clientId: c.client.id, entiteId: c.siegeEntiteId };
}

describe("CreateLicenceUseCase", () => {
  it("INSERT lic_licences + reference LIC-{YYYY}-{NNN} + audit LICENCE_CREATED", async () => {
    const { clientId, entiteId } = await seedClientWithSiege();
    const result = await useCase.execute(
      {
        clientId,
        entiteId,
        dateDebut: new Date("2026-01-01"),
        dateFin: new Date("2027-12-31"),
      },
      ACTOR_ID,
    );

    const year = new Date().getFullYear();
    // Phase 16 — DETTE-LIC-011 résolue : la séquence PG est globale (non
    // resetée par test), on vérifie le format au lieu de la valeur exacte.
    expect(result.licence.reference).toMatch(new RegExp(`^LIC-${String(year)}-\\d{3,}$`));
    expect(result.licence.status).toBe("ACTIF");
    expect(result.licence.version).toBe(0);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${result.licence.id}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("LICENCE_CREATED");
  });

  it("alloue références incrémentales et distinctes (séquence PG)", async () => {
    const { clientId, entiteId } = await seedClientWithSiege();
    const r1 = await useCase.execute(
      { clientId, entiteId, dateDebut: new Date("2026-01-01"), dateFin: new Date("2027-12-31") },
      ACTOR_ID,
    );
    const r2 = await useCase.execute(
      { clientId, entiteId, dateDebut: new Date("2026-01-01"), dateFin: new Date("2027-12-31") },
      ACTOR_ID,
    );
    const r3 = await useCase.execute(
      { clientId, entiteId, dateDebut: new Date("2026-01-01"), dateFin: new Date("2027-12-31") },
      ACTOR_ID,
    );
    // Phase 16 — DETTE-LIC-011 : la séquence PG garantit unicité + monotonie
    // mais pas reset à 001 entre tests. On vérifie le format + que les 3
    // valeurs sont strictement croissantes.
    const year = new Date().getFullYear();
    const refRegex = new RegExp(`^LIC-${String(year)}-(\\d{3,})$`);
    const n1 = Number(refRegex.exec(r1.licence.reference)?.[1] ?? "0");
    const n2 = Number(refRegex.exec(r2.licence.reference)?.[1] ?? "0");
    const n3 = Number(refRegex.exec(r3.licence.reference)?.[1] ?? "0");
    expect(n1).toBeGreaterThan(0);
    expect(n2).toBe(n1 + 1);
    expect(n3).toBe(n2 + 1);
  });

  it("rejette dateFin <= dateDebut — SPX-LIC-737", async () => {
    const { clientId, entiteId } = await seedClientWithSiege();
    await expect(
      useCase.execute(
        {
          clientId,
          entiteId,
          dateDebut: new Date("2027-01-01"),
          dateFin: new Date("2026-01-01"),
        },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-737" });
  });
});
