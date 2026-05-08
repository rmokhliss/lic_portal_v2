// ==============================================================================
// LIC v2 — Tests d'intégration fichier-log + generate + import (Phase 10)
// ==============================================================================

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import postgres from "postgres";

import { ArticleRepositoryPg } from "../../article/adapters/postgres/article.repository.pg";
import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { ClientRepositoryPg } from "../../client/adapters/postgres/client.repository.pg";
import { EntiteRepositoryPg } from "../../entite/adapters/postgres/entite.repository.pg";
import { LicenceRepositoryPg } from "../../licence/adapters/postgres/licence.repository.pg";
import { LicenceArticleRepositoryPg } from "../../licence-article/adapters/postgres/licence-article.repository.pg";
import { UpdateArticleVolumeUseCase } from "../../licence-article/application/update-article-volume.usecase";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { FichierLogRepositoryPg } from "../adapters/postgres/fichier-log.repository.pg";
import { GenerateLicenceFichierUseCase } from "../application/generate-licence-fichier.usecase";
import { ImportHealthcheckUseCase } from "../application/import-healthcheck.usecase";
import { ListFichiersByLicenceUseCase } from "../application/list-fichiers-by-licence.usecase";
import { LogFichierGenereUseCase } from "../application/log-fichier-genere.usecase";
import { LogHealthcheckImporteUseCase } from "../application/log-healthcheck-importe.usecase";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let generateLic: GenerateLicenceFichierUseCase;
let importHealth: ImportHealthcheckUseCase;
let listFichiers: ListFichiersByLicenceUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const licenceRepo = new LicenceRepositoryPg();
  const clientRepo = new ClientRepositoryPg();
  const entiteRepo = new EntiteRepositoryPg();
  const articleRepo = new ArticleRepositoryPg();
  const liaRepo = new LicenceArticleRepositoryPg();
  const fichierRepo = new FichierLogRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  const logFichier = new LogFichierGenereUseCase(fichierRepo);
  const logHealthcheck = new LogHealthcheckImporteUseCase(fichierRepo);
  const updateVolume = new UpdateArticleVolumeUseCase(liaRepo, userRepo, auditRepo);

  generateLic = new GenerateLicenceFichierUseCase(
    licenceRepo,
    clientRepo,
    entiteRepo,
    liaRepo,
    articleRepo,
    logFichier,
  );
  importHealth = new ImportHealthcheckUseCase(
    licenceRepo,
    articleRepo,
    liaRepo,
    updateVolume,
    logHealthcheck,
  );
  listFichiers = new ListFichiersByLicenceUseCase(fichierRepo);
});

beforeEach(async () => {
  await sql`TRUNCATE TABLE
    lic_fichiers_log, lic_audit_log, lic_article_volume_history,
    lic_licence_articles, lic_licence_produits, lic_renouvellements,
    lic_licences, lic_contacts_clients, lic_entites, lic_clients,
    lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES
      (${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'SADMIN', false, NOW(), NOW()),
      (${ACTOR_ID}, 'MAT-001', 'ADMIN', 'Système', 'admin@s2m.ma',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'ADMIN', true, NOW(), NOW())
  `;
});

afterAll(async () => {
  await sql`TRUNCATE TABLE
    lic_fichiers_log, lic_audit_log, lic_article_volume_history,
    lic_licence_articles, lic_licence_produits, lic_renouvellements,
    lic_licences, lic_contacts_clients, lic_entites, lic_clients,
    lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
  await sql.end();
});

interface SetupOutput {
  readonly licenceId: string;
  readonly licenceArticleId: string;
}

async function setupFixture(): Promise<SetupOutput> {
  const clients = await sql<{ id: string }[]>`
    INSERT INTO lic_clients (code_client, raison_sociale, statut_client, cree_par, created_at, updated_at)
    VALUES ('TST', 'Test Bank', 'ACTIF', ${ACTOR_ID}::uuid, NOW(), NOW())
    RETURNING id
  `;
  const clientId = clients[0]?.id;
  if (clientId === undefined) throw new TypeError("INSERT clients failed");

  const entites = await sql<{ id: string }[]>`
    INSERT INTO lic_entites (client_id, nom, actif, cree_par, created_at, updated_at)
    VALUES (${clientId}::uuid, 'Siège', true, ${ACTOR_ID}::uuid, NOW(), NOW())
    RETURNING id
  `;
  const entiteId = entites[0]?.id;
  if (entiteId === undefined) throw new TypeError("INSERT entites failed");

  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - 30);
  const dateFin = new Date();
  dateFin.setDate(dateFin.getDate() + 365);
  const licences = await sql<{ id: string }[]>`
    INSERT INTO lic_licences (
      reference, client_id, entite_id, date_debut, date_fin, status,
      version, renouvellement_auto, notif_envoyee, cree_par, created_at, updated_at
    )
    VALUES (
      'LIC-2026-001', ${clientId}::uuid, ${entiteId}::uuid,
      ${dateDebut.toISOString()}, ${dateFin.toISOString()}, 'ACTIF',
      0, false, false, ${ACTOR_ID}::uuid, NOW(), NOW()
    )
    RETURNING id
  `;
  const licenceId = licences[0]?.id;
  if (licenceId === undefined) throw new TypeError("INSERT licences failed");

  const produits = await sql<{ id: number }[]>`
    INSERT INTO lic_produits_ref (code, nom, actif) VALUES ('SPX-CORE', 'Core', true) RETURNING id
  `;
  const produitId = produits[0]?.id;
  if (produitId === undefined) throw new TypeError("INSERT produits failed");

  const articles = await sql<{ id: number }[]>`
    INSERT INTO lic_articles_ref (produit_id, code, nom, unite_volume, actif)
    VALUES (${produitId}, 'USERS', 'Utilisateurs', 'transactions', true)
    RETURNING id
  `;
  const articleId = articles[0]?.id;
  if (articleId === undefined) throw new TypeError("INSERT articles failed");

  const liaisons = await sql<{ id: string }[]>`
    INSERT INTO lic_licence_articles (
      licence_id, article_id, volume_autorise, volume_consomme, cree_par, modifie_par, created_at, updated_at
    )
    VALUES (${licenceId}::uuid, ${articleId}, 1000, 0, ${ACTOR_ID}::uuid, ${ACTOR_ID}::uuid, NOW(), NOW())
    RETURNING id
  `;
  const licenceArticleId = liaisons[0]?.id;
  if (licenceArticleId === undefined) throw new TypeError("INSERT liaison failed");

  return { licenceId, licenceArticleId };
}

describe("GenerateLicenceFichier (Phase 10.C)", () => {
  it("génère un JSON + hash + log fichier-log avec statut GENERATED", async () => {
    const fixture = await setupFixture();
    const result = await generateLic.execute({ licenceId: fixture.licenceId }, ACTOR_ID);

    expect(result.content.reference).toBe("LIC-2026-001");
    expect(result.content.articles).toHaveLength(1);
    expect(result.content.articles[0]?.code).toBe("USERS");
    expect(result.content.articles[0]?.volume).toBe(1000);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);

    const logs = await listFichiers.execute(fixture.licenceId);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.type).toBe("LIC_GENERATED");
    expect(logs[0]?.statut).toBe("GENERATED");
    expect(logs[0]?.hash).toBe(result.hash);
  });
});

describe("ImportHealthcheck (Phase 10.D)", () => {
  it("parse JSON + applique vol_consomme + log statut IMPORTED", async () => {
    const fixture = await setupFixture();
    const json = JSON.stringify({
      licenceReference: "LIC-2026-001",
      articles: [{ code: "USERS", volConsomme: 250 }],
    });

    const result = await importHealth.execute(
      { licenceId: fixture.licenceId, filename: "hc.json", content: json },
      ACTOR_ID,
    );

    expect(result.updated).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.fichierLog?.statut).toBe("IMPORTED");

    // Vérifie que le volume_consomme a été appliqué.
    const liaisons = await sql<{ volume_consomme: number }[]>`
      SELECT volume_consomme FROM lic_licence_articles WHERE id = ${fixture.licenceArticleId}::uuid
    `;
    expect(liaisons[0]?.volume_consomme).toBe(250);
  });

  it("parse CSV + applique vol_consomme", async () => {
    const fixture = await setupFixture();
    const csv = "article_code,vol_consomme\nUSERS,500\n";

    const result = await importHealth.execute(
      { licenceId: fixture.licenceId, filename: "hc.csv", content: csv },
      ACTOR_ID,
    );

    expect(result.updated).toBe(1);
    expect(result.errors).toBe(0);

    const liaisons = await sql<{ volume_consomme: number }[]>`
      SELECT volume_consomme FROM lic_licence_articles WHERE id = ${fixture.licenceArticleId}::uuid
    `;
    expect(liaisons[0]?.volume_consomme).toBe(500);
  });

  it("article inconnu → erreur dans errorDetails mais log IMPORTED si autres OK", async () => {
    const fixture = await setupFixture();
    const json = JSON.stringify({
      articles: [
        { code: "UNKNOWN", volConsomme: 100 },
        { code: "USERS", volConsomme: 250 },
      ],
    });

    const result = await importHealth.execute(
      { licenceId: fixture.licenceId, filename: "hc.json", content: json },
      ACTOR_ID,
    );

    expect(result.updated).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.errorDetails[0]).toContain("UNKNOWN");
    expect(result.fichierLog?.statut).toBe("IMPORTED");
  });

  it("contenu vide → throw + log statut ERREUR", async () => {
    const fixture = await setupFixture();
    await expect(
      importHealth.execute(
        { licenceId: fixture.licenceId, filename: "hc.json", content: "   " },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-901" });

    const logs = await listFichiers.execute(fixture.licenceId);
    expect(logs.find((l) => l.statut === "ERREUR")).toBeDefined();
  });
});
