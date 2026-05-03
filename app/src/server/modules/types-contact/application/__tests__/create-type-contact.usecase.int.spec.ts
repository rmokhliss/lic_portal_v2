// ==============================================================================
// LIC v2 — Test d'intégration CreateTypeContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TypeContactRepositoryPg } from "../../adapters/postgres/type-contact.repository.pg";
import { CreateTypeContactUseCase } from "../create-type-contact.usecase";

const ctx = createTestDb();
const repo = new TypeContactRepositoryPg(ctx.db);
const useCase = new CreateTypeContactUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("CreateTypeContactUseCase", () => {
  it("INSERT et retourne le DTO", async () => {
    const dto = await useCase.execute({ code: "DIRECTION", libelle: "Direction générale" });
    expect(dto.code).toBe("DIRECTION");
    expect(dto.libelle).toBe("Direction générale");
    expect(dto.actif).toBe(true);
  });

  it("rejette code minuscules (SPX-LIC-714)", async () => {
    await expect(useCase.execute({ code: "rh", libelle: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-714",
    });
  });

  it("throw ConflictError SPX-LIC-713 si code existe (seed bootstrap)", async () => {
    await expect(useCase.execute({ code: "ACHAT", libelle: "Doublon" })).rejects.toMatchObject({
      code: "SPX-LIC-713",
    });
  });
});
