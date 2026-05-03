// ==============================================================================
// LIC v2 — Test d'intégration GetTypeContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TypeContactRepositoryPg } from "../../adapters/postgres/type-contact.repository.pg";
import { GetTypeContactUseCase } from "../get-type-contact.usecase";

const ctx = createTestDb();
const repo = new TypeContactRepositoryPg(ctx.db);
const useCase = new GetTypeContactUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("GetTypeContactUseCase", () => {
  it("retourne ACHAT (seedé bootstrap)", async () => {
    const result = await useCase.execute("ACHAT");
    expect(result.code).toBe("ACHAT");
    expect(result.libelle).toBe("Achats");
  });

  it("throw NotFoundError SPX-LIC-712 si code inexistant", async () => {
    await expect(useCase.execute("ZZZ")).rejects.toMatchObject({ code: "SPX-LIC-712" });
  });

  it("throw ValidationError SPX-LIC-714 si code minuscules", async () => {
    await expect(useCase.execute("achat")).rejects.toMatchObject({ code: "SPX-LIC-714" });
  });

  it("throw ValidationError SPX-LIC-714 si code vide", async () => {
    await expect(useCase.execute("")).rejects.toMatchObject({ code: "SPX-LIC-714" });
  });
});
