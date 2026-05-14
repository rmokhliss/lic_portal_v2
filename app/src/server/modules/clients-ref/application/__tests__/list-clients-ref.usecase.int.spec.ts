// ==============================================================================
// LIC v2 — Test d'intégration ListClientsRefUseCase (Phase 24)
//
// Pattern transactionnel : BEGIN/ROLLBACK via setupTransactionalTests. La
// table `lic_clients_ref` est vide au bootstrap-only — les tests insèrent
// leurs propres fixtures dans la transaction (rollback automatique).
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { ClientRefRepositoryPg } from "../../adapters/postgres/client-ref.repository.pg";
import { ListClientsRefUseCase } from "../list-clients-ref.usecase";

const ctx = createTestDb();
const repo = new ClientRefRepositoryPg(ctx.db);
const useCase = new ListClientsRefUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("ListClientsRefUseCase", () => {
  it("retourne items + total quand la table contient des entrées", async () => {
    await ctx.sql`
      INSERT INTO lic_clients_ref (code_client, raison_sociale, actif) VALUES
        ('TEST_A', 'Test A SARL', true),
        ('TEST_B', 'Test B Bank', true),
        ('TEST_C', 'Test C Inactif', false)
    `;
    const result = await useCase.execute();
    const codes = result.items.map((c) => c.codeClient);
    expect(codes).toEqual(expect.arrayContaining(["TEST_A", "TEST_B", "TEST_C"]));
    expect(result.total).toBeGreaterThanOrEqual(3);
  });

  it("filtre actif=true exclut les inactifs", async () => {
    await ctx.sql`
      INSERT INTO lic_clients_ref (code_client, raison_sociale, actif)
      VALUES ('TEST_INACTIF', 'Inactif', false)
    `;
    const result = await useCase.execute({ actif: true });
    expect(result.items.find((c) => c.codeClient === "TEST_INACTIF")).toBeUndefined();
  });

  it("limit + offset pagine correctement (tri code ASC)", async () => {
    await ctx.sql`
      INSERT INTO lic_clients_ref (code_client, raison_sociale, actif) VALUES
        ('PAGE_A', 'A', true),
        ('PAGE_B', 'B', true),
        ('PAGE_C', 'C', true),
        ('PAGE_D', 'D', true)
    `;
    const page1 = await useCase.execute({ actif: true, limit: 2, offset: 0 });
    const page2 = await useCase.execute({ actif: true, limit: 2, offset: 2 });
    const all = await useCase.execute({ actif: true });
    expect(page1.items.length).toBe(2);
    expect(page2.items.length).toBe(2);
    // Les 4 codes PAGE_* arrivent triés ASC, pas de doublon entre pages.
    const codes1 = page1.items.map((c) => c.codeClient);
    const codes2 = page2.items.map((c) => c.codeClient);
    for (const c of codes2) expect(codes1).not.toContain(c);
    // total est le total absolu, pas la taille de la page.
    expect(page1.total).toBe(all.total);
  });

  it("retourne un DTO sérialisable (createdAt ISO string)", async () => {
    await ctx.sql`
      INSERT INTO lic_clients_ref (code_client, raison_sociale, actif)
      VALUES ('DTO_TEST', 'DTO Test', true)
    `;
    const result = await useCase.execute({ limit: 500 });
    const sample = result.items.find((c) => c.codeClient === "DTO_TEST");
    expect(sample).toBeDefined();
    expect(typeof sample?.createdAt).toBe("string");
    expect(new Date(sample?.createdAt ?? "").toString()).not.toBe("Invalid Date");
  });
});
