// ==============================================================================
// LIC v2 — Test d'intégration CreateDeviseUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { DeviseRepositoryPg } from "../../adapters/postgres/devise.repository.pg";
import { CreateDeviseUseCase } from "../create-devise.usecase";

const ctx = createTestDb();
const repo = new DeviseRepositoryPg(ctx.db);
const useCase = new CreateDeviseUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("CreateDeviseUseCase", () => {
  it("INSERT et retourne le DTO", async () => {
    const dto = await useCase.execute({ codeDevise: "GBP", nom: "Livre sterling", symbole: "£" });
    expect(dto.codeDevise).toBe("GBP");
    expect(dto.symbole).toBe("£");
    expect(dto.actif).toBe(true);
  });

  it("symbole optionnel → null dans DTO", async () => {
    const dto = await useCase.execute({ codeDevise: "JPY", nom: "Yen" });
    expect(dto.symbole).toBeNull();
  });

  it("rejette codeDevise format invalide (SPX-LIC-708)", async () => {
    await expect(useCase.execute({ codeDevise: "ab", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-708",
    });
  });

  it("throw ConflictError SPX-LIC-707 si codeDevise existe (seed bootstrap)", async () => {
    await expect(useCase.execute({ codeDevise: "EUR", nom: "Doublon" })).rejects.toMatchObject({
      code: "SPX-LIC-707",
    });
  });
});
