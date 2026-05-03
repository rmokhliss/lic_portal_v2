// ==============================================================================
// LIC v2 — Test d'intégration CreatePaysUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { PaysRepositoryPg } from "../../adapters/postgres/pays.repository.pg";
import { CreatePaysUseCase } from "../create-pays.usecase";

const ctx = createTestDb();
const repo = new PaysRepositoryPg(ctx.db);
const useCase = new CreatePaysUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("CreatePaysUseCase — cas nominaux", () => {
  it("INSERT et retourne le DTO", async () => {
    const dto = await useCase.execute({
      codePays: "MA",
      nom: "Maroc",
      regionCode: "NORD_AFRIQUE",
    });
    expect(dto.codePays).toBe("MA");
    expect(dto.regionCode).toBe("NORD_AFRIQUE");
    expect(dto.actif).toBe(true);
    expect(typeof dto.id).toBe("number");
  });

  it("regionCode optionnel → null dans DTO", async () => {
    const dto = await useCase.execute({ codePays: "XX", nom: "Test" });
    expect(dto.regionCode).toBeNull();
  });

  it("actif=false explicite", async () => {
    const dto = await useCase.execute({ codePays: "XY", nom: "Test", actif: false });
    expect(dto.actif).toBe(false);
  });
});

describe("CreatePaysUseCase — invariants (SPX-LIC-705)", () => {
  it("rejette codePays vide AVANT BD", async () => {
    await expect(useCase.execute({ codePays: "", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-705",
    });
  });

  it("rejette codePays > 2 chars", async () => {
    await expect(useCase.execute({ codePays: "MAR", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-705",
    });
  });
});

describe("CreatePaysUseCase — conflit unicité (SPX-LIC-704)", () => {
  it("throw ConflictError si codePays existe déjà", async () => {
    await useCase.execute({ codePays: "MA", nom: "Maroc" });
    await expect(useCase.execute({ codePays: "MA", nom: "Doublon" })).rejects.toMatchObject({
      code: "SPX-LIC-704",
    });
  });
});
