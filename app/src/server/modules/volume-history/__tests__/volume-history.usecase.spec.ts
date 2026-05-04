// ==============================================================================
// LIC v2 — Test d'intégration use-cases volume-history (Phase 6 étape 6.D)
//
// Pattern transactionnel (pas de db.transaction interne dans les use-cases :
// pas d'audit). Reset via TRUNCATE pour partir d'un état propre.
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
import { VolumeHistoryRepositoryPg } from "../adapters/postgres/volume-history.repository.pg";
import { ListVolumeHistoryUseCase } from "../application/list-volume-history.usecase";
import { RecordVolumeSnapshotUseCase } from "../application/record-volume-snapshot.usecase";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClient: CreateClientUseCase;
let createLicence: CreateLicenceUseCase;
let createProduit: CreateProduitUseCase;
let createArticle: CreateArticleUseCase;
let record: RecordVolumeSnapshotUseCase;
let list: ListVolumeHistoryUseCase;

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
  const vhRepo = new VolumeHistoryRepositoryPg();
  createClient = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  createLicence = new CreateLicenceUseCase(licenceRepo, userRepo, auditRepo);
  createProduit = new CreateProduitUseCase(produitRepo);
  createArticle = new CreateArticleUseCase(articleRepo, produitRepo);
  record = new RecordVolumeSnapshotUseCase(vhRepo);
  list = new ListVolumeHistoryUseCase(vhRepo);
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

describe("VolumeHistory use-cases", () => {
  it("RecordVolumeSnapshot : INSERT + DTO périodisé YYYY-MM-DD", async () => {
    const { licenceId, articleId } = await seedSetup();
    const dto = await record.execute({
      licenceId,
      articleId,
      periode: new Date("2026-04-01"),
      volumeAutorise: 1000,
      volumeConsomme: 250,
    });
    expect(dto.periode).toBe("2026-04-01");
    expect(dto.volumeAutorise).toBe(1000);
    expect(dto.volumeConsomme).toBe(250);
  });

  it("RecordVolumeSnapshot : conflit unique périodique SPX-LIC-754", async () => {
    const { licenceId, articleId } = await seedSetup();
    const periode = new Date("2026-04-01");
    await record.execute({
      licenceId,
      articleId,
      periode,
      volumeAutorise: 1000,
      volumeConsomme: 250,
    });
    await expect(
      record.execute({
        licenceId,
        articleId,
        periode,
        volumeAutorise: 2000,
        volumeConsomme: 500,
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-754" });
  });

  it("RecordVolumeSnapshot : volume négatif SPX-LIC-753", async () => {
    const { licenceId, articleId } = await seedSetup();
    await expect(
      record.execute({
        licenceId,
        articleId,
        periode: new Date("2026-04-01"),
        volumeAutorise: -1,
        volumeConsomme: 0,
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-753" });
  });

  it("List paginated : retour ordre DESC createdAt + cursor next", async () => {
    const { licenceId, articleId } = await seedSetup();
    await record.execute({
      licenceId,
      articleId,
      periode: new Date("2026-01-01"),
      volumeAutorise: 100,
      volumeConsomme: 10,
    });
    await record.execute({
      licenceId,
      articleId,
      periode: new Date("2026-02-01"),
      volumeAutorise: 200,
      volumeConsomme: 20,
    });
    await record.execute({
      licenceId,
      articleId,
      periode: new Date("2026-03-01"),
      volumeAutorise: 300,
      volumeConsomme: 30,
    });

    const page = await list.execute({ licenceId });
    expect(page.items).toHaveLength(3);
    // Ordre DESC createdAt — les + récents (mars) viennent en premier.
    expect(page.items[0]?.periode).toBe("2026-03-01");
    expect(page.nextCursor).toBeNull();
  });

  it("List paginated : cursor + limit", async () => {
    const { licenceId, articleId } = await seedSetup();
    for (let m = 1; m <= 5; m++) {
      await record.execute({
        licenceId,
        articleId,
        periode: new Date(`2026-0${String(m)}-01`),
        volumeAutorise: m * 100,
        volumeConsomme: m,
      });
    }

    const p1 = await list.execute({ licenceId, limit: 2 });
    expect(p1.items).toHaveLength(2);
    expect(p1.nextCursor).not.toBeNull();

    const cursor = p1.nextCursor;
    expect(cursor).not.toBeNull();
    const p2 = await list.execute({ licenceId, limit: 2, cursor: cursor ?? undefined });
    expect(p2.items).toHaveLength(2);
    // Disjoints
    const p1Ids = new Set(p1.items.map((i) => i.id));
    const p2Ids = new Set(p2.items.map((i) => i.id));
    for (const id of p2Ids) expect(p1Ids.has(id)).toBe(false);
  });
});
