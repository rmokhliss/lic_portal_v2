// ==============================================================================
// LIC v2 — Test d'intégration UpdateDeviseUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { DeviseRepositoryPg } from "../../adapters/postgres/devise.repository.pg";
import { UpdateDeviseUseCase } from "../update-devise.usecase";

const ctx = createTestDb();
const repo = new DeviseRepositoryPg(ctx.db);
const useCase = new UpdateDeviseUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("UpdateDeviseUseCase — patch nom", () => {
  it("met à jour le nom (devise seedée MAD)", async () => {
    const dto = await useCase.execute({ codeDevise: "MAD", nom: "Dirham" });
    expect(dto.nom).toBe("Dirham");
    expect(dto.symbole).toBe("DH"); // inchangé
  });
});

describe("UpdateDeviseUseCase — patch symbole", () => {
  it("symbole=string remplace", async () => {
    const dto = await useCase.execute({ codeDevise: "MAD", symbole: "Dh" });
    expect(dto.symbole).toBe("Dh");
  });

  it("symbole=null efface", async () => {
    const dto = await useCase.execute({ codeDevise: "MAD", symbole: null });
    expect(dto.symbole).toBeNull();
  });

  it("symbole undefined → inchangé", async () => {
    const dto = await useCase.execute({ codeDevise: "MAD", nom: "Dirham" });
    expect(dto.symbole).toBe("DH");
  });
});

describe("UpdateDeviseUseCase — erreurs", () => {
  it("throw NotFoundError SPX-LIC-706 si codeDevise inexistant", async () => {
    await expect(useCase.execute({ codeDevise: "ZZZ", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-706",
    });
  });
});
