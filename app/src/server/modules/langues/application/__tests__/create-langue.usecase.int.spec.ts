// ==============================================================================
// LIC v2 — Test d'intégration CreateLangueUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { LangueRepositoryPg } from "../../adapters/postgres/langue.repository.pg";
import { CreateLangueUseCase } from "../create-langue.usecase";

const ctx = createTestDb();
const repo = new LangueRepositoryPg(ctx.db);
const useCase = new CreateLangueUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("CreateLangueUseCase", () => {
  it("INSERT et retourne le DTO", async () => {
    const dto = await useCase.execute({ codeLangue: "ar", nom: "العربية" });
    expect(dto.codeLangue).toBe("ar");
    expect(dto.actif).toBe(true);
  });

  it("rejette codeLangue MAJUSCULE (SPX-LIC-711)", async () => {
    await expect(useCase.execute({ codeLangue: "AR", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-711",
    });
  });

  it("throw ConflictError SPX-LIC-710 si codeLangue existe (seed bootstrap)", async () => {
    await expect(useCase.execute({ codeLangue: "fr", nom: "Doublon" })).rejects.toMatchObject({
      code: "SPX-LIC-710",
    });
  });
});
