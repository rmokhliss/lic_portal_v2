// ==============================================================================
// LIC v2 — Tests d'intégration jobs (Phase 8.C)
//
// On invoque les handlers directement (mode MANUAL) — pas de pg-boss runtime.
// Vérifie les effets BD : snapshot créé, notification créée, licence expirée
// avec audit JOB.
// ==============================================================================

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../scripts/load-env";

import postgres from "postgres";

import { runAutoRenewLicences } from "../handlers/auto-renew-licences.handler";
import { runCheckAlerts } from "../handlers/check-alerts.handler";
import { runExpireLicences } from "../handlers/expire-licences.handler";
import { runSnapshotVolumes } from "../handlers/snapshot-volumes.handler";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
});

beforeEach(async () => {
  await sql`TRUNCATE TABLE
    lic_batch_logs, lic_batch_executions, lic_batch_jobs,
    lic_audit_log, lic_notifications, lic_alert_configs,
    lic_article_volume_history, lic_licence_articles, lic_licence_produits,
    lic_renouvellements, lic_licences, lic_contacts_clients, lic_entites,
    lic_clients, lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
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
  // Le job tracker dépend de lic_batch_jobs (FK execution_id → job_code).
  // On insère les 3 lignes catalogue manuellement (idempotent par code).
  await sql`
    INSERT INTO lic_batch_jobs (code, libelle) VALUES
      ('snapshot-volumes', 'Snapshot volumes'),
      ('check-alerts', 'Check alerts'),
      ('expire-licences', 'Expire licences'),
      ('auto-renew-licences', 'Auto-renew licences')
    ON CONFLICT (code) DO NOTHING
  `;
});

afterAll(async () => {
  // Nettoyage final pour ne pas polluer les autres fichiers de tests.
  await sql`TRUNCATE TABLE
    lic_batch_logs, lic_batch_executions, lic_batch_jobs,
    lic_audit_log, lic_notifications, lic_alert_configs,
    lic_article_volume_history, lic_licence_articles, lic_licence_produits,
    lic_renouvellements, lic_licences, lic_contacts_clients, lic_entites,
    lic_clients, lic_articles_ref, lic_produits_ref, lic_users CASCADE`;
  await sql.end();
});

interface SetupOutput {
  readonly clientId: string;
  readonly entiteId: string;
  readonly licenceId: string;
  readonly articleId: number;
  readonly licenceArticleId: string;
}

async function setupFixture(opts: {
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
  readonly dateFinDaysFromNow: number;
  readonly licenceStatus?: "ACTIF" | "EXPIRE";
}): Promise<SetupOutput> {
  // 1. Client + entité (siège manuel)
  const clients = await sql<{ id: string }[]>`
    INSERT INTO lic_clients (code_client, raison_sociale, statut_client, cree_par, created_at, updated_at)
    VALUES ('TST', 'Test Bank', 'ACTIF', ${ACTOR_ID}::uuid, NOW(), NOW())
    RETURNING id
  `;
  const firstClient = clients[0];
  if (firstClient === undefined) throw new TypeError("INSERT lic_clients no row");
  const clientId = firstClient.id;
  const entites = await sql<{ id: string }[]>`
    INSERT INTO lic_entites (client_id, nom, actif, cree_par, created_at, updated_at)
    VALUES (${clientId}::uuid, 'Siège', true, ${ACTOR_ID}::uuid, NOW(), NOW())
    RETURNING id
  `;
  const firstEntite = entites[0];
  if (firstEntite === undefined) throw new TypeError("INSERT lic_entites no row");
  const entiteId = firstEntite.id;

  // 2. Licence
  const dateFin = new Date();
  dateFin.setDate(dateFin.getDate() + opts.dateFinDaysFromNow);
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - 365);
  const status = opts.licenceStatus ?? "ACTIF";
  const licences = await sql<{ id: string }[]>`
    INSERT INTO lic_licences (
      reference, client_id, entite_id, date_debut, date_fin, status,
      version, renouvellement_auto, notif_envoyee, cree_par, created_at, updated_at
    )
    VALUES (
      'LIC-2026-001', ${clientId}::uuid, ${entiteId}::uuid,
      ${dateDebut.toISOString()}, ${dateFin.toISOString()}, ${status},
      0, false, false, ${ACTOR_ID}::uuid, NOW(), NOW()
    )
    RETURNING id
  `;
  const firstLicence = licences[0];
  if (firstLicence === undefined) throw new TypeError("INSERT lic_licences no row");
  const licenceId = firstLicence.id;

  // 3. Produit + article
  const produits = await sql<{ id: number }[]>`
    INSERT INTO lic_produits_ref (code, nom, actif) VALUES ('SPX-CORE', 'Core', true) RETURNING id
  `;
  const firstProduit = produits[0];
  if (firstProduit === undefined) throw new TypeError("INSERT lic_produits_ref no row");
  const produitId = firstProduit.id;
  const articles = await sql<{ id: number }[]>`
    INSERT INTO lic_articles_ref (produit_id, code, nom, unite_volume, actif)
    VALUES (${produitId}, 'USERS', 'Utilisateurs', 'transactions', true)
    RETURNING id
  `;
  const firstArticle = articles[0];
  if (firstArticle === undefined) throw new TypeError("INSERT lic_articles_ref no row");
  const articleId = firstArticle.id;

  // 4. Liaison licence-article avec volumes
  const liaisons = await sql<{ id: string }[]>`
    INSERT INTO lic_licence_articles (
      licence_id, article_id, volume_autorise, volume_consomme, cree_par, modifie_par, created_at, updated_at
    )
    VALUES (
      ${licenceId}::uuid, ${articleId}, ${opts.volumeAutorise}, ${opts.volumeConsomme},
      ${ACTOR_ID}::uuid, ${ACTOR_ID}::uuid, NOW(), NOW()
    )
    RETURNING id
  `;
  const firstLiaison = liaisons[0];
  if (firstLiaison === undefined) throw new TypeError("INSERT lic_licence_articles no row");
  const licenceArticleId = firstLiaison.id;

  return { clientId, entiteId, licenceId, articleId, licenceArticleId };
}

describe("Job snapshot-volumes", () => {
  it("crée un snapshot par licence-article + execution SUCCESS", async () => {
    await setupFixture({
      volumeAutorise: 1000,
      volumeConsomme: 250,
      dateFinDaysFromNow: 365,
    });

    const result = await runSnapshotVolumes("MANUAL");

    expect(result.status).toBe("SUCCESS");
    expect((result.stats as { created?: number }).created).toBe(1);

    const snapshots = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM lic_article_volume_history
    `;
    expect(snapshots[0]?.count).toBe("1");

    const exec = await sql<{ status: string }[]>`
      SELECT status FROM lic_batch_executions WHERE job_code = 'snapshot-volumes'
    `;
    expect(exec[0]?.status).toBe("SUCCESS");
  });
});

describe("Job check-alerts", () => {
  it("crée une notification VOLUME_THRESHOLD si seuil dépassé", async () => {
    const fixture = await setupFixture({
      volumeAutorise: 1000,
      volumeConsomme: 850, // 85% > 80% seuil
      dateFinDaysFromNow: 365,
    });

    // Crée une AlertConfig active avec seuil volume 80%
    await sql`
      INSERT INTO lic_alert_configs (
        client_id, libelle, canaux, seuil_volume_pct, actif, cree_par, modifie_par,
        created_at, updated_at
      )
      VALUES (
        ${fixture.clientId}::uuid, 'Volume 80%', ARRAY['IN_APP']::alert_channel_enum[],
        80, true, ${ACTOR_ID}::uuid, ${ACTOR_ID}::uuid, NOW(), NOW()
      )
    `;

    const result = await runCheckAlerts("MANUAL");
    expect(result.status).toBe("SUCCESS");
    expect((result.stats as { notified?: number }).notified).toBeGreaterThan(0);

    const notifs = await sql<{ source: string; user_id: string }[]>`
      SELECT source, user_id FROM lic_notifications
    `;
    expect(notifs.find((n) => n.source === "VOLUME_THRESHOLD")).toBeDefined();
    // Le destinataire est l'admin (ACTOR_ID actif role=ADMIN seedé en afterEach).
    expect(notifs.find((n) => n.user_id === ACTOR_ID)).toBeDefined();
  });
});

describe("Job expire-licences", () => {
  it("expire les licences ACTIF avec date_fin < NOW + audit JOB SYS-000", async () => {
    await setupFixture({
      volumeAutorise: 1000,
      volumeConsomme: 0,
      dateFinDaysFromNow: -10, // déjà expirée hier
    });

    const result = await runExpireLicences("MANUAL");
    expect(result.status).toBe("SUCCESS");
    expect((result.stats as { expired?: number }).expired).toBe(1);

    const licences = await sql<{ status: string }[]>`SELECT status FROM lic_licences`;
    expect(licences[0]?.status).toBe("EXPIRE");

    // Audit obligatoire — règle L3 — avec acteur SYSTEM + mode JOB.
    const audit = await sql<
      {
        action: string;
        user_id: string;
        user_display: string;
        mode: string;
      }[]
    >`
      SELECT action, user_id, user_display, mode FROM lic_audit_log
      WHERE entity = 'licence'
    `;
    const expired = audit.find((a) => a.action === "LICENCE_EXPIRED_BY_JOB");
    expect(expired).toBeDefined();
    expect(expired?.user_id).toBe(SYSTEM_USER_ID);
    expect(expired?.user_display).toBe("Système (SYS-000)");
    expect(expired?.mode).toBe("JOB");
  });
});

describe("Job auto-renew-licences (Phase 9.C)", () => {
  it("crée un renouvellement CREE + notification + audit JOB pour licence éligible", async () => {
    // Licence éligible : renouvellement_auto=true + ACTIF + date_fin dans 15j.
    const fixture = await setupFixture({
      volumeAutorise: 1000,
      volumeConsomme: 0,
      dateFinDaysFromNow: 15,
    });
    await sql`
      UPDATE lic_licences SET renouvellement_auto = true WHERE id = ${fixture.licenceId}::uuid
    `;

    const result = await runAutoRenewLicences("MANUAL");
    expect(result.status).toBe("SUCCESS");
    expect((result.stats as { eligible?: number }).eligible).toBe(1);
    expect((result.stats as { created?: number }).created).toBe(1);

    // 1 renouvellement statut CREE.
    const renouvs = await sql<{ status: string; licence_id: string }[]>`
      SELECT status, licence_id FROM lic_renouvellements
    `;
    expect(renouvs).toHaveLength(1);
    expect(renouvs[0]?.status).toBe("CREE");
    expect(renouvs[0]?.licence_id).toBe(fixture.licenceId);

    // Audit RENOUVELLEMENT_CREATED_BY_JOB avec mode='JOB'.
    const audit = await sql<{ action: string; user_id: string; mode: string }[]>`
      SELECT action, user_id, mode FROM lic_audit_log WHERE entity = 'renouvellement'
    `;
    expect(audit.find((a) => a.action === "RENOUVELLEMENT_CREATED_BY_JOB")).toBeDefined();
    expect(audit[0]?.user_id).toBe(SYSTEM_USER_ID);
    expect(audit[0]?.mode).toBe("JOB");

    // Au moins 1 notification pour ACTOR_ID (admin actif).
    const notifs = await sql<{ source: string; user_id: string }[]>`
      SELECT source, user_id FROM lic_notifications WHERE source = 'AUTO_RENEW_PROPOSED'
    `;
    expect(notifs.find((n) => n.user_id === ACTOR_ID)).toBeDefined();
  });

  it("ignore les licences sans renouvellement_auto", async () => {
    await setupFixture({
      volumeAutorise: 1000,
      volumeConsomme: 0,
      dateFinDaysFromNow: 15,
    });
    // renouvellement_auto reste false par défaut

    const result = await runAutoRenewLicences("MANUAL");
    expect((result.stats as { eligible?: number }).eligible).toBe(0);
    expect((result.stats as { created?: number }).created).toBe(0);

    const renouvs = await sql<{ id: string }[]>`SELECT id FROM lic_renouvellements`;
    expect(renouvs).toHaveLength(0);
  });
});
