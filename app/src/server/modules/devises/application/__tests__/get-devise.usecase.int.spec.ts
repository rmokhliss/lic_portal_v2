// ==============================================================================
// LIC v2 — Test d'intégration GetDeviseUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { DeviseRepositoryPg } from "../../adapters/postgres/devise.repository.pg";
import { GetDeviseUseCase } from "../get-devise.usecase";

const ctx = createTestDb();
const repo = new DeviseRepositoryPg(ctx.db);
const useCase = new GetDeviseUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("GetDeviseUseCase", () => {
  it("retourne MAD avec symbole DH", async () => {
    const result = await useCase.execute("MAD");
    expect(result.codeDevise).toBe("MAD");
    expect(result.symbole).toBe("DH");
  });

  it("throw NotFoundError SPX-LIC-706 si codeDevise inexistant", async () => {
    await expect(useCase.execute("XYZ")).rejects.toMatchObject({ code: "SPX-LIC-706" });
  });

  it("throw ValidationError SPX-LIC-708 si codeDevise format invalide", async () => {
    await expect(useCase.execute("eur")).rejects.toMatchObject({ code: "SPX-LIC-708" });
  });

  it("throw ValidationError SPX-LIC-708 si codeDevise vide", async () => {
    await expect(useCase.execute("")).rejects.toMatchObject({ code: "SPX-LIC-708" });
  });
});
