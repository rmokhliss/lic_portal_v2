// ==============================================================================
// LIC v2 — Test d'intégration CreateClientUseCase (Phase 4 étape 4.B)
//
// Pattern TRUNCATE+reseed (R-28) — use-case ouvre db.transaction interne.
// 4 cas couverts : nominal (client + Siège + audit), conflit code, validation
// domaine, vérif Siège créé en cascade.
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { ClientRepositoryPg } from "../adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../application/create-client.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let useCase: CreateClientUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  useCase = new CreateClientUseCase(
    new ClientRepositoryPg(),
    new UserRepositoryPg(),
    new AuditRepositoryPg(),
  );
});

// Pattern aligné user specs : afterEach reseede SYS-000 SEUL (sinon le user
// ACTOR_ID survit et pollue les autres spec files — bootstrap-admin attend
// SYS-000 seul). seedActor() inline dans chaque test qui exécute le use-case.
afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_contacts_clients, lic_entites, lic_clients, lic_users CASCADE`;
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

describe("CreateClientUseCase — cas nominal", () => {
  it("INSERT lic_clients + lic_entites Siège + audit dans même tx", async () => {
    await seedActor();
    const result = await useCase.execute(
      {
        codeClient: "BAM",
        raisonSociale: "Bank Al-Maghrib",
        // codePays/codeDevise omis — bootstrap BD ne seede pas lic_pays_ref
        // (pays ajoutés via pnpm db:seed en dev). Les FK sont nullable.
        codeDevise: "MAD",
      },
      ACTOR_ID,
    );

    expect(result.client.codeClient).toBe("BAM");
    expect(result.client.statutClient).toBe("ACTIF");
    expect(result.client.version).toBe(0);
    expect(result.siegeEntiteId).toMatch(/^[0-9a-f-]{36}$/);

    // Vérifie l'entité Siège créée en BD avec FK au client
    const entites = await sql<{ id: string; nom: string; client_id: string }[]>`
      SELECT id, nom, client_id FROM lic_entites WHERE client_id = ${result.client.id}
    `;
    expect(entites).toHaveLength(1);
    expect(entites[0]?.id).toBe(result.siegeEntiteId);
    expect(entites[0]?.nom).toBe("Bank Al-Maghrib"); // default = raisonSociale

    // Audit log
    const audit = await sql<{ action: string; user_display: string | null }[]>`
      SELECT action, user_display FROM lic_audit_log WHERE entity_id = ${result.client.id}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("CLIENT_CREATED");
    expect(audit[0]?.user_display).toBe("Système ADMIN (MAT-001)");
  });

  it("respecte siegeNom personnalisé", async () => {
    await seedActor();
    const result = await useCase.execute(
      {
        codeClient: "ATW",
        raisonSociale: "Attijariwafa Group",
        siegeNom: "Casablanca HQ",
      },
      ACTOR_ID,
    );
    const rows = await sql<{ nom: string }[]>`
      SELECT nom FROM lic_entites WHERE client_id = ${result.client.id}
    `;
    expect(rows[0]?.nom).toBe("Casablanca HQ");
  });
});

describe("CreateClientUseCase — conflit code (SPX-LIC-725)", () => {
  it("rejette si codeClient déjà utilisé — pas d'orphelin BD", async () => {
    await seedActor();
    await useCase.execute({ codeClient: "BAM", raisonSociale: "Bank Al-Maghrib" }, ACTOR_ID);

    await expect(
      useCase.execute({ codeClient: "BAM", raisonSociale: "Doublon" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-725" });

    // Vérif rollback transactionnel : pas de 2e ligne créée + pas d'orphelin
    // entité (le findByCode est dans la tx → pas d'INSERT effectué).
    const clients = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM lic_clients`;
    expect(clients[0]?.count).toBe("1");
    const entites = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM lic_entites`;
    expect(entites[0]?.count).toBe("1");
  });
});

describe("CreateClientUseCase — validation domaine (SPX-LIC-726)", () => {
  it("rejette codeClient au format invalide", async () => {
    await seedActor();
    await expect(
      useCase.execute({ codeClient: "bad code lower!", raisonSociale: "X" }, ACTOR_ID),
    ).rejects.toMatchObject({ code: "SPX-LIC-726" });
  });
});
