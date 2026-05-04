// ==============================================================================
// LIC v2 — Test d'intégration audit-query (Phase 7 étape 7.A)
//
// Vérifie le scope client/licence (multi-entités) + recherche FTS + count.
// Pattern TRUNCATE+reseed (pas d'audit dans les use-cases query, mais on
// touche aux mêmes tables que les use-cases mutateurs qui les remplissent).
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import postgres from "postgres";

import { ArticleRepositoryPg } from "../../article/adapters/postgres/article.repository.pg";
import { CreateArticleUseCase } from "../../article/application/create-article.usecase";
import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { ClientRepositoryPg } from "../../client/adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../../client/application/create-client.usecase";
import { LicenceRepositoryPg } from "../../licence/adapters/postgres/licence.repository.pg";
import { CreateLicenceUseCase } from "../../licence/application/create-licence.usecase";
import { LicenceArticleRepositoryPg } from "../../licence-article/adapters/postgres/licence-article.repository.pg";
import { AddArticleToLicenceUseCase } from "../../licence-article/application/add-article-to-licence.usecase";
import { ProduitRepositoryPg } from "../../produit/adapters/postgres/produit.repository.pg";
import { CreateProduitUseCase } from "../../produit/application/create-produit.usecase";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { AuditQueryRepositoryPg } from "../adapters/postgres/audit-query.repository.pg";
import { ExportAuditCsvUseCase } from "../application/export-audit-csv.usecase";
import { ListAuditByClientScopeUseCase } from "../application/list-audit-by-client-scope.usecase";
import { ListAuditByEntityUseCase } from "../application/list-audit-by-entity.usecase";
import { ListAuditByLicenceScopeUseCase } from "../application/list-audit-by-licence-scope.usecase";
import { SearchAuditUseCase } from "../application/search-audit.usecase";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClient: CreateClientUseCase;
let createLicence: CreateLicenceUseCase;
let createProduit: CreateProduitUseCase;
let createArticle: CreateArticleUseCase;
let addArticle: AddArticleToLicenceUseCase;
let listByEntity: ListAuditByEntityUseCase;
let listByClientScope: ListAuditByClientScopeUseCase;
let listByLicenceScope: ListAuditByLicenceScopeUseCase;
let search: SearchAuditUseCase;
let exportCsv: ExportAuditCsvUseCase;

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
  const articleRepo = new ArticleRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  const laRepo = new LicenceArticleRepositoryPg();
  const aqRepo = new AuditQueryRepositoryPg();
  createClient = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  createLicence = new CreateLicenceUseCase(licenceRepo, userRepo, auditRepo);
  createProduit = new CreateProduitUseCase(produitRepo);
  createArticle = new CreateArticleUseCase(articleRepo, produitRepo);
  addArticle = new AddArticleToLicenceUseCase(
    laRepo,
    licenceRepo,
    articleRepo,
    userRepo,
    auditRepo,
  );
  listByEntity = new ListAuditByEntityUseCase(aqRepo);
  listByClientScope = new ListAuditByClientScopeUseCase(aqRepo);
  listByLicenceScope = new ListAuditByLicenceScopeUseCase(aqRepo);
  search = new SearchAuditUseCase(aqRepo);
  exportCsv = new ExportAuditCsvUseCase(aqRepo);
});

afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_article_volume_history, lic_licence_articles, lic_licence_produits, lic_renouvellements, lic_licences, lic_contacts_clients, lic_entites, lic_clients, lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
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

describe("AuditQuery — listByEntity", () => {
  it("retourne les actions sur (entity, entityId)", async () => {
    await seedActor();
    const c = await createClient.execute(
      { codeClient: "TST", raisonSociale: "Test Bank" },
      ACTOR_ID,
    );

    const page = await listByEntity.execute({ entity: "client", entityId: c.client.id });
    // CreateClient émet CLIENT_CREATED + ENTITE_CREATED (siège). Filtre entity='client'
    // ne capture que la 1ère.
    expect(page.items.find((i) => i.action === "CLIENT_CREATED")).toBeDefined();
  });
});

describe("AuditQuery — listByClientScope", () => {
  it("capte audit direct (CLIENT_CREATED) + indirect via licence (LICENCE_CREATED)", async () => {
    await seedActor();
    const c = await createClient.execute(
      { codeClient: "TST", raisonSociale: "Test Bank" },
      ACTOR_ID,
    );
    // CreateClient inclut la création d'un siège entité dans la même tx (sans
    // audit ENTITE_CREATED séparé — siegeEntiteId tracé dans afterData de
    // CLIENT_CREATED). On vérifie l'agrégation client+licence.
    const l = await createLicence.execute(
      {
        clientId: c.client.id,
        entiteId: c.siegeEntiteId,
        dateDebut: new Date("2026-01-01"),
        dateFin: new Date("2027-12-31"),
      },
      ACTOR_ID,
    );

    const page = await listByClientScope.execute({ clientId: c.client.id });
    const actions = page.items.map((i) => i.action);
    expect(actions).toContain("CLIENT_CREATED");
    expect(actions).toContain("LICENCE_CREATED");
    // Vérifie que la licence est captée même sans clientId direct dans audit
    // (LICENCE_CREATED est tracé avec entityId=licenceId, pas clientId — cf. R-33).
    const licenceEntry = page.items.find((i) => i.action === "LICENCE_CREATED");
    expect(licenceEntry?.entityId).toBe(l.licence.id);
  });
});

describe("AuditQuery — listByLicenceScope", () => {
  it("capte LICENCE_CREATED + LICENCE_ARTICLE_ADDED via licence-article scope", async () => {
    await seedActor();
    const c = await createClient.execute(
      { codeClient: "TST", raisonSociale: "Test Bank" },
      ACTOR_ID,
    );
    const l = await createLicence.execute(
      {
        clientId: c.client.id,
        entiteId: c.siegeEntiteId,
        dateDebut: new Date("2026-01-01"),
        dateFin: new Date("2027-12-31"),
      },
      ACTOR_ID,
    );
    const p = await createProduit.execute({ code: "SPX-CORE", nom: "Core" });
    const a = await createArticle.execute({ produitId: p.id, code: "USERS", nom: "Users" });
    await addArticle.execute(
      { licenceId: l.licence.id, articleId: a.id, volumeAutorise: 1000 },
      ACTOR_ID,
    );

    const page = await listByLicenceScope.execute({ licenceId: l.licence.id });
    const actions = page.items.map((i) => i.action);
    expect(actions).toContain("LICENCE_CREATED");
    expect(actions).toContain("LICENCE_ARTICLE_ADDED");
  });
});

describe("AuditQuery — search + filtres", () => {
  it("filtre action retourne uniquement les matchs", async () => {
    await seedActor();
    await createClient.execute({ codeClient: "TST1", raisonSociale: "B1" }, ACTOR_ID);
    await createClient.execute({ codeClient: "TST2", raisonSociale: "B2" }, ACTOR_ID);

    const page = await search.execute({ action: "CLIENT_CREATED" });
    expect(page.items.length).toBeGreaterThanOrEqual(2);
    expect(page.items.every((i) => i.action === "CLIENT_CREATED")).toBe(true);
  });

  it("cursor pagination disjoint", async () => {
    await seedActor();
    for (let i = 1; i <= 6; i++) {
      await createClient.execute(
        { codeClient: `TST${String(i)}`, raisonSociale: `B${String(i)}` },
        ACTOR_ID,
      );
    }
    const p1 = await search.execute({ action: "CLIENT_CREATED", limit: 2 });
    expect(p1.items).toHaveLength(2);
    expect(p1.nextCursor).not.toBeNull();
    const p2 = await search.execute({
      action: "CLIENT_CREATED",
      limit: 2,
      cursor: p1.nextCursor ?? undefined,
    });
    const p1Ids = new Set(p1.items.map((i) => i.id));
    for (const i of p2.items) expect(p1Ids.has(i.id)).toBe(false);
  });
});

describe("AuditQuery — exportCsv", () => {
  it("retourne un CSV avec header + lignes", async () => {
    await seedActor();
    await createClient.execute({ codeClient: "TST", raisonSociale: "B" }, ACTOR_ID);

    const csv = await exportCsv.execute({ action: "CLIENT_CREATED" });
    const lines = csv.split("\r\n").filter((l) => l.length > 0);
    expect(lines[0]).toContain("id,createdAt,userDisplay");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[1]).toContain("CLIENT_CREATED");
  });
});
