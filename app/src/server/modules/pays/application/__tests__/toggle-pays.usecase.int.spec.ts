// ==============================================================================
// LIC v2 — Test d'intégration TogglePaysUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { PaysRepositoryPg } from "../../adapters/postgres/pays.repository.pg";
import { CreatePaysUseCase } from "../create-pays.usecase";
import { TogglePaysUseCase } from "../toggle-pays.usecase";

const ctx = createTestDb();
const repo = new PaysRepositoryPg(ctx.db);
const createUseCase = new CreatePaysUseCase(repo);
const useCase = new TogglePaysUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

beforeEach(async () => {
  await createUseCase.execute({ codePays: "MA", nom: "Maroc" });
});

describe("TogglePaysUseCase", () => {
  it("première bascule : actif=true → false", async () => {
    const dto = await useCase.execute("MA");
    expect(dto.actif).toBe(false);
  });

  it("deuxième bascule : false → true", async () => {
    await useCase.execute("MA");
    const dto = await useCase.execute("MA");
    expect(dto.actif).toBe(true);
  });

  it("throw NotFoundError SPX-LIC-703 si inexistant", async () => {
    await expect(useCase.execute("ZZ")).rejects.toMatchObject({ code: "SPX-LIC-703" });
  });
});
