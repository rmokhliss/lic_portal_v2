// ==============================================================================
// LIC v2 — Test d'intégration ListTypesContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TypeContactRepositoryPg } from "../../adapters/postgres/type-contact.repository.pg";
import { ListTypesContactUseCase } from "../list-types-contact.usecase";

const ctx = createTestDb();
const repo = new TypeContactRepositoryPg(ctx.db);
const useCase = new ListTypesContactUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("ListTypesContactUseCase", () => {
  it("retourne les 3 types seedés bootstrap triés ASC", async () => {
    const result = await useCase.execute();
    const codes = result.map((t) => t.code);
    expect(codes).toEqual(expect.arrayContaining(["ACHAT", "FACTURATION", "TECHNIQUE"]));
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
  });

  it("filtre par actif", async () => {
    await ctx.sql`
      INSERT INTO lic_types_contact_ref (code, libelle, actif) VALUES ('TEST_X', 'Test', false)
    `;
    const actives = await useCase.execute({ actif: true });
    expect(actives.find((t) => t.code === "TEST_X")).toBeUndefined();
  });

  it("DTO contient libelle (pas nom)", async () => {
    const result = await useCase.execute();
    const achat = result.find((t) => t.code === "ACHAT");
    expect(achat?.libelle).toBe("Achats");
  });
});
