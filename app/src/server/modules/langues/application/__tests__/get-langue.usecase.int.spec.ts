// ==============================================================================
// LIC v2 — Test d'intégration GetLangueUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { LangueRepositoryPg } from "../../adapters/postgres/langue.repository.pg";
import { GetLangueUseCase } from "../get-langue.usecase";

const ctx = createTestDb();
const repo = new LangueRepositoryPg(ctx.db);
const useCase = new GetLangueUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("GetLangueUseCase", () => {
  it("retourne fr (seedée bootstrap)", async () => {
    const result = await useCase.execute("fr");
    expect(result.codeLangue).toBe("fr");
    expect(result.nom).toBe("Français");
  });

  it("throw NotFoundError SPX-LIC-709 si codeLangue inexistant", async () => {
    await expect(useCase.execute("zh")).rejects.toMatchObject({ code: "SPX-LIC-709" });
  });

  it("throw ValidationError SPX-LIC-711 si codeLangue MAJUSCULE", async () => {
    await expect(useCase.execute("FR")).rejects.toMatchObject({ code: "SPX-LIC-711" });
  });

  it("throw ValidationError SPX-LIC-711 si codeLangue vide", async () => {
    await expect(useCase.execute("")).rejects.toMatchObject({ code: "SPX-LIC-711" });
  });
});
