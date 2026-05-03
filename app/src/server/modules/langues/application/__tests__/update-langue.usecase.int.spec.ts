// ==============================================================================
// LIC v2 — Test d'intégration UpdateLangueUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { LangueRepositoryPg } from "../../adapters/postgres/langue.repository.pg";
import { UpdateLangueUseCase } from "../update-langue.usecase";

const ctx = createTestDb();
const repo = new LangueRepositoryPg(ctx.db);
const useCase = new UpdateLangueUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("UpdateLangueUseCase", () => {
  it("met à jour le nom (langue seedée fr)", async () => {
    const dto = await useCase.execute({ codeLangue: "fr", nom: "French" });
    expect(dto.nom).toBe("French");
    expect(dto.codeLangue).toBe("fr");
  });

  it("rejette nom vide (SPX-LIC-711)", async () => {
    await expect(useCase.execute({ codeLangue: "fr", nom: "" })).rejects.toMatchObject({
      code: "SPX-LIC-711",
    });
  });

  it("throw NotFoundError SPX-LIC-709 si codeLangue inexistant", async () => {
    await expect(useCase.execute({ codeLangue: "zz", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-709",
    });
  });
});
