// ==============================================================================
// LIC v2 — Test d'intégration ToggleTypeContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TypeContactRepositoryPg } from "../../adapters/postgres/type-contact.repository.pg";
import { ToggleTypeContactUseCase } from "../toggle-type-contact.usecase";

const ctx = createTestDb();
const repo = new TypeContactRepositoryPg(ctx.db);
const useCase = new ToggleTypeContactUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("ToggleTypeContactUseCase", () => {
  it("première bascule ACHAT : true → false", async () => {
    const dto = await useCase.execute("ACHAT");
    expect(dto.actif).toBe(false);
  });

  it("deuxième bascule : false → true", async () => {
    await useCase.execute("ACHAT");
    const dto = await useCase.execute("ACHAT");
    expect(dto.actif).toBe(true);
  });

  it("throw NotFoundError SPX-LIC-712 si inexistant", async () => {
    await expect(useCase.execute("ZZZ")).rejects.toMatchObject({ code: "SPX-LIC-712" });
  });
});
