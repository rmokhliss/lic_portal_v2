// ==============================================================================
// LIC v2 — Tests d'intégration alert-config use-cases (Phase 8.B)
// Pattern TRUNCATE+reseed (audit transactionnel L3 dans use-cases mutateurs).
// ==============================================================================

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import postgres from "postgres";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { ClientRepositoryPg } from "../../client/adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../../client/application/create-client.usecase";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { AlertConfigRepositoryPg } from "../adapters/postgres/alert-config.repository.pg";
import { CreateAlertConfigUseCase } from "../application/create-alert-config.usecase";
import { DeleteAlertConfigUseCase } from "../application/delete-alert-config.usecase";
import { ListAlertConfigsByClientUseCase } from "../application/list-alert-configs-by-client.usecase";
import { UpdateAlertConfigUseCase } from "../application/update-alert-config.usecase";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createClient: CreateClientUseCase;
let createConfig: CreateAlertConfigUseCase;
let updateConfig: UpdateAlertConfigUseCase;
let deleteConfig: DeleteAlertConfigUseCase;
let listConfigs: ListAlertConfigsByClientUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const clientRepo = new ClientRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  const acRepo = new AlertConfigRepositoryPg();
  createClient = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  createConfig = new CreateAlertConfigUseCase(acRepo, userRepo, auditRepo);
  updateConfig = new UpdateAlertConfigUseCase(acRepo, userRepo, auditRepo);
  deleteConfig = new DeleteAlertConfigUseCase(acRepo, userRepo, auditRepo);
  listConfigs = new ListAlertConfigsByClientUseCase(acRepo);
});

beforeEach(async () => {
  // beforeEach (vs afterEach) pour résister à un état pollué laissé par un
  // autre fichier de test exécuté en amont (fileParallelism:false ne garantit
  // pas l'ordre cross-files).
  await sql`TRUNCATE TABLE lic_audit_log, lic_alert_configs, lic_renouvellements, lic_licences, lic_contacts_clients, lic_entites, lic_clients, lic_users CASCADE`;
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES (${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', false, NOW(), NOW())
  `;
});

afterAll(async () => {
  // Nettoyage final : ne pas laisser USER_A / ACTOR_ID en BD pour ne pas
  // polluer les autres fichiers de tests (cf. R-32 — bootstrap-only state).
  await sql`TRUNCATE TABLE lic_audit_log, lic_alert_configs, lic_renouvellements, lic_licences, lic_contacts_clients, lic_entites, lic_clients, lic_users CASCADE`;
  await sql.end();
});

async function seedActorAndClient(): Promise<{ clientId: string }> {
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES (${ACTOR_ID}, 'MAT-001', 'ADMIN', 'Système', 'admin@s2m.ma',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', true, NOW(), NOW())
  `;
  const c = await createClient.execute({ codeClient: "TST", raisonSociale: "Test Bank" }, ACTOR_ID);
  return { clientId: c.client.id };
}

describe("AlertConfig use-cases", () => {
  it("create OK + audit ALERT_CONFIG_CREATED", async () => {
    const { clientId } = await seedActorAndClient();
    const dto = await createConfig.execute(
      {
        clientId,
        libelle: "Volume 80% + 60j",
        seuilVolumePct: 80,
        seuilDateJours: 60,
      },
      ACTOR_ID,
    );
    expect(dto.libelle).toBe("Volume 80% + 60j");
    expect(dto.seuilVolumePct).toBe(80);
    expect(dto.seuilDateJours).toBe(60);
    expect(dto.canaux).toEqual(["IN_APP"]);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity = 'alert-config'
    `;
    expect(audit.find((a) => a.action === "ALERT_CONFIG_CREATED")).toBeDefined();
  });

  it("create rejette si aucun seuil — SPX-LIC-758", async () => {
    const { clientId } = await seedActorAndClient();
    await expect(
      createConfig.execute({ clientId, libelle: "Sans seuil" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-758" });
  });

  it("update modifie seuil + audit ALERT_CONFIG_UPDATED before/after", async () => {
    const { clientId } = await seedActorAndClient();
    const created = await createConfig.execute(
      { clientId, libelle: "Initial", seuilVolumePct: 80 },
      ACTOR_ID,
    );

    const updated = await updateConfig.execute(
      { id: created.id, seuilVolumePct: 90, libelle: "Renommé" },
      ACTOR_ID,
    );
    expect(updated.seuilVolumePct).toBe(90);
    expect(updated.libelle).toBe("Renommé");

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log
      WHERE entity = 'alert-config' ORDER BY created_at
    `;
    expect(audit.map((a) => a.action)).toEqual(["ALERT_CONFIG_CREATED", "ALERT_CONFIG_UPDATED"]);
  });

  it("delete : DELETE + audit ALERT_CONFIG_DELETED + n'apparaît plus dans list", async () => {
    const { clientId } = await seedActorAndClient();
    const created = await createConfig.execute(
      { clientId, libelle: "À supprimer", seuilVolumePct: 75 },
      ACTOR_ID,
    );

    await deleteConfig.execute({ id: created.id }, ACTOR_ID);

    const remaining = await listConfigs.execute(clientId);
    expect(remaining).toHaveLength(0);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity = 'alert-config'
    `;
    expect(audit.find((a) => a.action === "ALERT_CONFIG_DELETED")).toBeDefined();
  });
});
