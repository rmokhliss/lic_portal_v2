// ==============================================================================
// LIC v2 — Test d'intégration ToggleLangueUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { LangueRepositoryPg } from "../../adapters/postgres/langue.repository.pg";
import { ToggleLangueUseCase } from "../toggle-langue.usecase";

const ctx = createTestDb();
const repo = new LangueRepositoryPg(ctx.db);
const useCase = new ToggleLangueUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("ToggleLangueUseCase", () => {
  it("première bascule fr : true → false", async () => {
    const dto = await useCase.execute("fr");
    expect(dto.actif).toBe(false);
  });

  it("deuxième bascule : false → true", async () => {
    await useCase.execute("fr");
    const dto = await useCase.execute("fr");
    expect(dto.actif).toBe(true);
  });

  it("throw NotFoundError SPX-LIC-709 si inexistant", async () => {
    await expect(useCase.execute("zz")).rejects.toMatchObject({ code: "SPX-LIC-709" });
  });
});
