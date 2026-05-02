// ==============================================================================
// LIC v2 — Test d'intégration AuditRepositoryPg — CRUD basique (F-08)
//
// Pattern BEGIN/ROLLBACK via test-helpers (cf. setupTransactionalTests).
// Couvre save + findById + filtres simples de search (FTS dédié dans fts.spec.ts,
// pagination cursor dans cursor-pagination.spec.ts).
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";

import { AuditRepositoryPg } from "../audit.repository.pg";

// Init top-level : postgres-js est lazy (pas de connexion réseau ici).
const ctx = createTestDb();
const repo = new AuditRepositoryPg(ctx.db);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

const TEST_ENTITY_ID = "01928c8e-aaaa-bbbb-cccc-ddddeeee0001";

describe("AuditRepositoryPg.save", () => {
  it("INSERT puis findById récupère l'entité avec les mêmes champs", async () => {
    const entry = AuditEntry.system({
      entity: "user",
      entityId: TEST_ENTITY_ID,
      action: "PASSWORD_CHANGED",
      beforeData: { foo: 1 },
      afterData: { foo: 2 },
      metadata: { source: "test" },
    });

    await repo.save(entry);

    // Recherche via search() pour récupérer l'id généré BD (uuidv7).
    const page = await repo.search({ entityId: TEST_ENTITY_ID });
    expect(page.items).toHaveLength(1);
    const persisted = page.items[0];
    expect(persisted).toBeDefined();
    expect(persisted?.entity).toBe("user");
    expect(persisted?.entityId).toBe(TEST_ENTITY_ID);
    expect(persisted?.action).toBe("PASSWORD_CHANGED");
    expect(persisted?.userId).toBe(SYSTEM_USER_ID);
    expect(persisted?.mode).toBe("JOB");
    expect(persisted?.beforeData).toEqual({ foo: 1 });
    expect(persisted?.metadata).toEqual({ source: "test" });
    expect(persisted?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(persisted?.createdAt).toBeInstanceOf(Date);
  });
});

describe("AuditRepositoryPg.findById", () => {
  it("retourne null pour un id inexistant", async () => {
    const result = await repo.findById("01928c8e-9999-9999-9999-999999999999");
    expect(result).toBeNull();
  });

  it("retourne PersistedAuditEntry pour un id existant", async () => {
    const entry = AuditEntry.system({
      entity: "user",
      entityId: TEST_ENTITY_ID,
      action: "TEST_FIND",
    });
    await repo.save(entry);
    const page = await repo.search({ entityId: TEST_ENTITY_ID });
    const id = page.items[0]?.id;
    expect(id).toBeDefined();
    // eslint-disable-next-line no-restricted-syntax -- assertion fixture pour aider TS narrowing
    if (id === undefined) throw new Error("id should be defined");

    const found = await repo.findById(id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(id);
    expect(found?.action).toBe("TEST_FIND");
  });
});

describe("AuditRepositoryPg.search — filtres simples", () => {
  it("filtre par entity", async () => {
    await repo.save(AuditEntry.system({ entity: "user", entityId: TEST_ENTITY_ID, action: "A" }));
    await repo.save(
      AuditEntry.system({
        entity: "licence",
        entityId: TEST_ENTITY_ID,
        action: "B",
      }),
    );

    const userPage = await repo.search({ entity: "user" });
    expect(userPage.items.every((e) => e.entity === "user")).toBe(true);
    expect(userPage.items.length).toBeGreaterThanOrEqual(1);
  });

  it("filtre par mode", async () => {
    await repo.save(AuditEntry.system({ entity: "user", entityId: TEST_ENTITY_ID, action: "A" }));
    const jobPage = await repo.search({ mode: "JOB" });
    expect(jobPage.items.every((e) => e.mode === "JOB")).toBe(true);
  });

  it("retourne effectiveLimit (default 50)", async () => {
    const page = await repo.search({});
    expect(page.effectiveLimit).toBe(50);
  });

  it("respecte le limit fourni", async () => {
    const page = await repo.search({ limit: 10 });
    expect(page.effectiveLimit).toBe(10);
  });
});
