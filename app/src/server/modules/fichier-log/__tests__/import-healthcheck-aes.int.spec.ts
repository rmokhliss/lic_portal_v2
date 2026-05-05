// ==============================================================================
// LIC v2 — Tests d'intégration import-healthcheck (Phase 14 — AES-GCM bouclage)
//
// Couvre le mode AES (DETTE-LIC-008 résolue) :
//   - Round-trip : encrypt → import OK → volume_consomme appliqué
//   - Tag mismatch (contenu altéré) → SPX-LIC-402 + log ERREUR
//   - Clé partagée absente en BD → SPX-LIC-411 + log ERREUR
// ==============================================================================

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import postgres from "postgres";

import { encryptAes256Gcm, generateAes256Key } from "../../crypto/domain/aes";
import { ArticleRepositoryPg } from "../../article/adapters/postgres/article.repository.pg";
import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { LicenceRepositoryPg } from "../../licence/adapters/postgres/licence.repository.pg";
import { LicenceArticleRepositoryPg } from "../../licence-article/adapters/postgres/licence-article.repository.pg";
import { UpdateArticleVolumeUseCase } from "../../licence-article/application/update-article-volume.usecase";
import { SettingRepositoryPg } from "../../settings/adapters/postgres/setting.repository.pg";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { FichierLogRepositoryPg } from "../adapters/postgres/fichier-log.repository.pg";
import { ImportHealthcheckUseCase } from "../application/import-healthcheck.usecase";
import { ListFichiersByLicenceUseCase } from "../application/list-fichiers-by-licence.usecase";
import { LogHealthcheckImporteUseCase } from "../application/log-healthcheck-importe.usecase";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000098";
const SHARED_KEY_SETTING = "healthcheck_shared_aes_key";

let sql: postgres.Sql;
let useCase: ImportHealthcheckUseCase;
let listFichiers: ListFichiersByLicenceUseCase;
let sharedKey: string;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });

  sharedKey = generateAes256Key();

  const licenceRepo = new LicenceRepositoryPg();
  const articleRepo = new ArticleRepositoryPg();
  const liaRepo = new LicenceArticleRepositoryPg();
  const fichierRepo = new FichierLogRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  const settingRepo = new SettingRepositoryPg();
  const logHealthcheck = new LogHealthcheckImporteUseCase(fichierRepo);
  const updateVolume = new UpdateArticleVolumeUseCase(liaRepo, userRepo, auditRepo);

  useCase = new ImportHealthcheckUseCase(
    licenceRepo,
    articleRepo,
    liaRepo,
    updateVolume,
    logHealthcheck,
    settingRepo,
  );
  listFichiers = new ListFichiersByLicenceUseCase(fichierRepo);
});

beforeEach(async () => {
  await sql`TRUNCATE TABLE
    lic_fichiers_log, lic_audit_log, lic_article_volume_history,
    lic_licence_articles, lic_licence_produits, lic_renouvellements,
    lic_licences, lic_contacts_clients, lic_entites, lic_clients,
    lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
  await sql`DELETE FROM lic_settings WHERE key = ${SHARED_KEY_SETTING}`;
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES
      (${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'SADMIN', false, NOW(), NOW()),
      (${ACTOR_ID}, 'MAT-098', 'AES', 'Test', 'aes-test@s2m.ma',
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
  await sql`DELETE FROM lic_settings WHERE key = ${SHARED_KEY_SETTING}`;
  await sql.end();
});

interface SetupOutput {
  readonly licenceId: string;
  readonly licenceArticleId: string;
}

async function setupFixture(): Promise<SetupOutput> {
  const clients = await sql<{ id: string }[]>`
    INSERT INTO lic_clients (code_client, raison_sociale, statut_client, cree_par, created_at, updated_at)
    VALUES ('AESHC', 'AES HC Bank', 'ACTIF', ${ACTOR_ID}::uuid, NOW(), NOW())
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
  const dateFin = new Date();
  dateFin.setDate(dateFin.getDate() + 365);
  const licences = await sql<{ id: string }[]>`
    INSERT INTO lic_licences (
      reference, client_id, entite_id, date_debut, date_fin, status,
      version, renouvellement_auto, notif_envoyee, cree_par, created_at, updated_at
    )
    VALUES (
      'LIC-2026-903', ${clientId}::uuid, ${entiteId}::uuid,
      ${dateDebut.toISOString()}, ${dateFin.toISOString()}, 'ACTIF',
      0, false, false, ${ACTOR_ID}::uuid, NOW(), NOW()
    )
    RETURNING id
  `;
  const licenceId = licences[0]?.id;
  if (licenceId === undefined) throw new TypeError("INSERT licences failed");

  const produits = await sql<{ id: number }[]>`
    INSERT INTO lic_produits_ref (code, nom, actif) VALUES ('SPX-AES', 'AES Core', true) RETURNING id
  `;
  const produitId = produits[0]?.id;
  if (produitId === undefined) throw new TypeError("INSERT produits failed");

  const articles = await sql<{ id: number }[]>`
    INSERT INTO lic_articles_ref (produit_id, code, nom, unite_volume, actif)
    VALUES (${produitId}, 'TXN', 'Transactions', 'transactions', true)
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

async function setSharedKey(key: string): Promise<void> {
  await sql`
    INSERT INTO lic_settings (key, value, updated_by)
    VALUES (${SHARED_KEY_SETTING}, ${JSON.stringify(key)}::jsonb, ${SYSTEM_USER_ID}::uuid)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

describe("ImportHealthcheck — mode AES-GCM (Phase 14)", () => {
  it("round-trip : encrypt(JSON, sharedKey) → decrypt + apply vol_consomme", async () => {
    await setSharedKey(sharedKey);
    const fixture = await setupFixture();

    const plaintext = JSON.stringify({
      licenceReference: "LIC-2026-903",
      articles: [{ code: "TXN", volConsomme: 750 }],
    });
    const encrypted = encryptAes256Gcm(plaintext, sharedKey);

    const result = await useCase.execute(
      { licenceId: fixture.licenceId, filename: "hc.enc", content: encrypted },
      ACTOR_ID,
    );

    expect(result.updated).toBe(1);
    expect(result.errors).toBe(0);

    const liaisons = await sql<{ volume_consomme: number }[]>`
      SELECT volume_consomme FROM lic_licence_articles WHERE id = ${fixture.licenceArticleId}::uuid
    `;
    expect(liaisons[0]?.volume_consomme).toBe(750);
  });

  it("contenu altéré → SPX-LIC-402 (tag mismatch) + log ERREUR", async () => {
    await setSharedKey(sharedKey);
    const fixture = await setupFixture();

    const plaintext = JSON.stringify({ articles: [{ code: "TXN", volConsomme: 500 }] });
    const encrypted = encryptAes256Gcm(plaintext, sharedKey);
    // Altère le ciphertext (dernier segment) en flippant un caractère.
    const parts = encrypted.split(":");
    const ct = parts[2] ?? "";
    const tampered = parts.slice(0, 2).join(":") + ":" + flipFirstChar(ct);

    await expect(
      useCase.execute(
        { licenceId: fixture.licenceId, filename: "hc.enc", content: tampered },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-402" });

    const logs = await listFichiers.execute(fixture.licenceId);
    expect(logs.find((l) => l.statut === "ERREUR")).toBeDefined();
  });

  it("clé partagée absente en BD → SPX-LIC-411 + log ERREUR", async () => {
    // Pas de setSharedKey — la clé n'est pas en BD.
    const fixture = await setupFixture();

    const plaintext = JSON.stringify({ articles: [{ code: "TXN", volConsomme: 100 }] });
    const encrypted = encryptAes256Gcm(plaintext, sharedKey);

    await expect(
      useCase.execute(
        { licenceId: fixture.licenceId, filename: "hc.enc", content: encrypted },
        ACTOR_ID,
      ),
    ).rejects.toMatchObject({ code: "SPX-LIC-411" });

    const logs = await listFichiers.execute(fixture.licenceId);
    expect(logs.find((l) => l.statut === "ERREUR")).toBeDefined();
  });
});

function flipFirstChar(s: string): string {
  if (s.length === 0) return s;
  const first = s[0] ?? "";
  // base64 alphabet : A-Z a-z 0-9 + /
  // Pour rester valide base64 mais altérer le payload : remplacer 'A' par 'B', etc.
  const replacement = first === "A" ? "B" : "A";
  return replacement + s.slice(1);
}
