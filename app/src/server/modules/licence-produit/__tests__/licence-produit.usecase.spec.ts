// ==============================================================================
// LIC v2 — Test d'intégration use-cases licence-produit (Phase 6 étape 6.C)
// Pattern TRUNCATE+reseed (audit transactionnel L3).
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import postgres from "postgres";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { ClientRepositoryPg } from "../../client/adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../../client/application/create-client.usecase";
import { LicenceRepositoryPg } from "../../licence/adapters/postgres/licence.repository.pg";
import { CreateLicenceUseCase } from "../../licence/application/create-licence.usecase";
import { ProduitRepositoryPg } from "../../produit/adapters/postgres/produit.repository.pg";
import { CreateProduitUseCase } from "../../produit/application/create-produit.usecase";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { LicenceProduitRepositoryPg } from "../adapters/postgres/licence-produit.repository.pg";
import { AddProduitToLicenceUseCase } from "../application/add-produit-to-licence.usecase";
import { ListProduitsByLicenceUseCase } from "../application/list-produits-by-licence.usecase";
import { RemoveProduitFromLicenceUseCase } from "../application/remove-produit-from-licence.usecase";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClient: CreateClientUseCase;
let createLicence: CreateLicenceUseCase;
let createProduit: CreateProduitUseCase;
let addProduit: AddProduitToLicenceUseCase;
let removeProduit: RemoveProduitFromLicenceUseCase;
let listProduits: ListProduitsByLicenceUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const clientRepo = new ClientRepositoryPg();
  const licenceRepo = new LicenceRepositoryPg();
  const produitRepo = new ProduitRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  const lpRepo = new LicenceProduitRepositoryPg();
  createClient = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  createLicence = new CreateLicenceUseCase(licenceRepo, userRepo, auditRepo);
  createProduit = new CreateProduitUseCase(produitRepo);
  addProduit = new AddProduitToLicenceUseCase(
    lpRepo,
    licenceRepo,
    produitRepo,
    userRepo,
    auditRepo,
  );
  removeProduit = new RemoveProduitFromLicenceUseCase(lpRepo, userRepo, auditRepo);
  listProduits = new ListProduitsByLicenceUseCase(lpRepo, produitRepo);
});

afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_licence_produits, lic_renouvellements, lic_licences, lic_contacts_clients, lic_entites, lic_clients, lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
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

async function seedSetup(): Promise<{ licenceId: string; produitId: number }> {
  await seedActor();
  const c = await createClient.execute({ codeClient: "TST", raisonSociale: "Test Bank" }, ACTOR_ID);
  const l = await createLicence.execute(
    {
      clientId: c.client.id,
      entiteId: c.siegeEntiteId,
      dateDebut: new Date("2026-01-01"),
      dateFin: new Date("2027-12-31"),
    },
    ACTOR_ID,
  );
  const p = await createProduit.execute({ code: "SPX-CORE", nom: "SELECT-PX Core" });
  return { licenceId: l.licence.id, produitId: p.id };
}

describe("LicenceProduit use-cases", () => {
  it("AddProduitToLicence : INSERT + audit LICENCE_PRODUIT_ADDED", async () => {
    const { licenceId, produitId } = await seedSetup();
    const dto = await addProduit.execute({ licenceId, produitId }, ACTOR_ID);
    expect(dto.licenceId).toBe(licenceId);
    expect(dto.produitId).toBe(produitId);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity = 'licence-produit'
    `;
    expect(audit.find((a) => a.action === "LICENCE_PRODUIT_ADDED")).toBeDefined();
  });

  it("AddProduitToLicence : conflit doublon SPX-LIC-750", async () => {
    const { licenceId, produitId } = await seedSetup();
    await addProduit.execute({ licenceId, produitId }, ACTOR_ID);
    await expect(addProduit.execute({ licenceId, produitId }, ACTOR_ID)).rejects.toMatchObject({
      code: "SPX-LIC-750",
    });
  });

  it("AddProduitToLicence : licence absente SPX-LIC-735", async () => {
    await seedActor();
    const p = await createProduit.execute({ code: "SPX-CORE", nom: "x" });
    await expect(
      addProduit.execute(
        { licenceId: "01928c8e-0000-0000-0000-000000000000", produitId: p.id },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-735" });
  });

  it("ListProduitsByLicence retourne avec produit dénormalisé", async () => {
    const { licenceId, produitId } = await seedSetup();
    await addProduit.execute({ licenceId, produitId }, ACTOR_ID);
    const list = await listProduits.execute(licenceId);
    expect(list).toHaveLength(1);
    expect(list[0]?.produit?.code).toBe("SPX-CORE");
  });

  it("RemoveProduitFromLicence : DELETE + audit LICENCE_PRODUIT_REMOVED", async () => {
    const { licenceId, produitId } = await seedSetup();
    const added = await addProduit.execute({ licenceId, produitId }, ACTOR_ID);
    await removeProduit.execute({ id: added.id }, ACTOR_ID);

    const remaining = await listProduits.execute(licenceId);
    expect(remaining).toHaveLength(0);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity = 'licence-produit'
    `;
    expect(audit.find((a) => a.action === "LICENCE_PRODUIT_REMOVED")).toBeDefined();
  });

  it("RemoveProduitFromLicence : id inconnu SPX-LIC-749", async () => {
    await seedActor();
    await expect(
      removeProduit.execute({ id: "01928c8e-0000-0000-0000-000000000000" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-749" });
  });
});
