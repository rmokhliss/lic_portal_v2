// ==============================================================================
// LIC v2 — Test d'intégration ToggleDeviseUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { DeviseRepositoryPg } from "../../adapters/postgres/devise.repository.pg";
import { ToggleDeviseUseCase } from "../toggle-devise.usecase";

const ctx = createTestDb();
const repo = new DeviseRepositoryPg(ctx.db);
const useCase = new ToggleDeviseUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("ToggleDeviseUseCase", () => {
  it("première bascule MAD : true → false", async () => {
    const dto = await useCase.execute("MAD");
    expect(dto.actif).toBe(false);
  });

  it("deuxième bascule : false → true", async () => {
    await useCase.execute("MAD");
    const dto = await useCase.execute("MAD");
    expect(dto.actif).toBe(true);
  });

  it("throw NotFoundError SPX-LIC-706 si inexistant", async () => {
    await expect(useCase.execute("ZZZ")).rejects.toMatchObject({ code: "SPX-LIC-706" });
  });
});
