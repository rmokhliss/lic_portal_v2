// ==============================================================================
// LIC v2 — Test d'intégration ListClientsUseCase (Phase 4 étape 4.B)
// Couvre : pagination cursor, filtre statut, FTS search_vector.
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { UserRepositoryPg } from "../../user/adapters/postgres/user.repository.pg";
import { ClientRepositoryPg } from "../adapters/postgres/client.repository.pg";
import { CreateClientUseCase } from "../application/create-client.usecase";
import { ListClientsUseCase } from "../application/list-clients.usecase";

import postgres from "postgres";

const ACTOR_ID = "01928c8e-aaaa-bbbb-cccc-dddd00000001";

let sql: postgres.Sql;
let createUseCase: CreateClientUseCase;
let useCase: ListClientsUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const clientRepo = new ClientRepositoryPg();
  const userRepo = new UserRepositoryPg();
  const auditRepo = new AuditRepositoryPg();
  createUseCase = new CreateClientUseCase(clientRepo, userRepo, auditRepo);
  useCase = new ListClientsUseCase(clientRepo);
});

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

describe("ListClientsUseCase — cursor pagination", () => {
  it("limit + nextCursor sur dataset > limit", async () => {
    await seedActor();
    // 5 clients, limit=2 → 3 pages (2+2+1)
    for (let i = 0; i < 5; i++) {
      await createUseCase.execute(
        { codeClient: `C${String(i).padStart(2, "0")}`, raisonSociale: `Client ${String(i)}` },
        ACTOR_ID,
      );
    }
    const page1 = await useCase.execute({ limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await useCase.execute({ limit: 2, cursor: page1.nextCursor ?? undefined });
    expect(page2.items).toHaveLength(2);
    expect(page2.nextCursor).not.toBeNull();

    const page3 = await useCase.execute({ limit: 2, cursor: page2.nextCursor ?? undefined });
    expect(page3.items).toHaveLength(1);
    expect(page3.nextCursor).toBeNull();

    const allCodes = [...page1.items, ...page2.items, ...page3.items].map((c) => c.codeClient);
    expect(new Set(allCodes).size).toBe(5);
  });
});

describe("ListClientsUseCase — filtres", () => {
  it("filtre statutClient unique", async () => {
    await seedActor();
    await createUseCase.execute(
      { codeClient: "P01", raisonSociale: "Prospect", statutClient: "PROSPECT" },
      ACTOR_ID,
    );
    await createUseCase.execute(
      { codeClient: "A01", raisonSociale: "Actif", statutClient: "ACTIF" },
      ACTOR_ID,
    );
    const result = await useCase.execute({ statutClient: "PROSPECT" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.codeClient).toBe("P01");
  });

  it("filtre FTS via q (recherche raisonSociale)", async () => {
    await seedActor();
    await createUseCase.execute({ codeClient: "BAM", raisonSociale: "Bank Al-Maghrib" }, ACTOR_ID);
    await createUseCase.execute(
      { codeClient: "ATW", raisonSociale: "Attijariwafa Group" },
      ACTOR_ID,
    );
    // search_vector est GENERATED — la query "Maghrib" doit matcher BAM uniquement.
    const result = await useCase.execute({ q: "Maghrib" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.codeClient).toBe("BAM");
  });
});
