// ==============================================================================
// LIC v2 — Test d'intégration use-cases licence-article (Phase 6 étape 6.C)
// Pattern TRUNCATE+reseed (audit transactionnel L3).
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
import { ProduitRepositoryPg } from "../../produit/adapters/postgres/produit.repository.pg";
import { CreateProduitUseCase } from "../../produit/application/create-produit.usecase";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { LicenceArticleRepositoryPg } from "../adapters/postgres/licence-article.repository.pg";
import { AddArticleToLicenceUseCase } from "../application/add-article-to-licence.usecase";
import { ListArticlesByLicenceUseCase } from "../application/list-articles-by-licence.usecase";
import { RemoveArticleFromLicenceUseCase } from "../application/remove-article-from-licence.usecase";
import { UpdateArticleVolumeUseCase } from "../application/update-article-volume.usecase";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClient: CreateClientUseCase;
let createLicence: CreateLicenceUseCase;
let createProduit: CreateProduitUseCase;
let createArticle: CreateArticleUseCase;
let addArticle: AddArticleToLicenceUseCase;
let updateVolume: UpdateArticleVolumeUseCase;
let removeArticle: RemoveArticleFromLicenceUseCase;
let listArticles: ListArticlesByLicenceUseCase;

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
  updateVolume = new UpdateArticleVolumeUseCase(laRepo, userRepo, auditRepo);
  removeArticle = new RemoveArticleFromLicenceUseCase(laRepo, userRepo, auditRepo);
  listArticles = new ListArticlesByLicenceUseCase(laRepo, articleRepo);
});

afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_licence_articles, lic_licence_produits, lic_renouvellements, lic_licences, lic_contacts_clients, lic_entites, lic_clients, lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
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

async function seedSetup(): Promise<{ licenceId: string; articleId: number }> {
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
  const p = await createProduit.execute({ code: "SPX-CORE", nom: "Core" });
  const a = await createArticle.execute({
    produitId: p.id,
    code: "USERS",
    nom: "Utilisateurs",
  });
  return { licenceId: l.licence.id, articleId: a.id };
}

describe("LicenceArticle use-cases", () => {
  it("AddArticleToLicence : INSERT + audit LICENCE_ARTICLE_ADDED", async () => {
    const { licenceId, articleId } = await seedSetup();
    const dto = await addArticle.execute({ licenceId, articleId, volumeAutorise: 1000 }, ACTOR_ID);
    expect(dto.volumeAutorise).toBe(1000);
    expect(dto.volumeConsomme).toBe(0);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity = 'licence-article'
    `;
    expect(audit.find((a) => a.action === "LICENCE_ARTICLE_ADDED")).toBeDefined();
  });

  it("AddArticleToLicence : doublon SPX-LIC-752", async () => {
    const { licenceId, articleId } = await seedSetup();
    await addArticle.execute({ licenceId, articleId, volumeAutorise: 100 }, ACTOR_ID);
    await expect(
      addArticle.execute({ licenceId, articleId, volumeAutorise: 200 }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-752" });
  });

  it("AddArticleToLicence : volume négatif SPX-LIC-753", async () => {
    const { licenceId, articleId } = await seedSetup();
    await expect(
      addArticle.execute({ licenceId, articleId, volumeAutorise: -1 }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-753" });
  });

  it("UpdateArticleVolume : UPDATE + audit before/after", async () => {
    const { licenceId, articleId } = await seedSetup();
    const added = await addArticle.execute({ licenceId, articleId, volumeAutorise: 100 }, ACTOR_ID);
    const upd = await updateVolume.execute({ id: added.id, volumeAutorise: 5000 }, ACTOR_ID);
    expect(upd.volumeAutorise).toBe(5000);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity = 'licence-article' ORDER BY created_at
    `;
    expect(audit.map((a) => a.action)).toEqual([
      "LICENCE_ARTICLE_ADDED",
      "LICENCE_ARTICLE_VOLUME_UPDATED",
    ]);
  });

  it("RemoveArticleFromLicence : DELETE + audit", async () => {
    const { licenceId, articleId } = await seedSetup();
    const added = await addArticle.execute({ licenceId, articleId, volumeAutorise: 100 }, ACTOR_ID);
    await removeArticle.execute({ id: added.id }, ACTOR_ID);

    const list = await listArticles.execute(licenceId);
    expect(list).toHaveLength(0);
  });

  it("ListArticlesByLicence dénormalise avec article", async () => {
    const { licenceId, articleId } = await seedSetup();
    await addArticle.execute({ licenceId, articleId, volumeAutorise: 100 }, ACTOR_ID);
    const list = await listArticles.execute(licenceId);
    expect(list[0]?.article?.code).toBe("USERS");
    expect(list[0]?.liaison.volumeAutorise).toBe(100);
  });
});
