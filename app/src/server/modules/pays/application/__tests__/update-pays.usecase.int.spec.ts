// ==============================================================================
// LIC v2 — Test d'intégration UpdatePaysUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { PaysRepositoryPg } from "../../adapters/postgres/pays.repository.pg";
import { CreatePaysUseCase } from "../create-pays.usecase";
import { UpdatePaysUseCase } from "../update-pays.usecase";

const ctx = createTestDb();
const repo = new PaysRepositoryPg(ctx.db);
const createUseCase = new CreatePaysUseCase(repo);
const useCase = new UpdatePaysUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

beforeEach(async () => {
  await createUseCase.execute({
    codePays: "MA",
    nom: "Maroc",
    regionCode: "NORD_AFRIQUE",
  });
});

describe("UpdatePaysUseCase — patch nom", () => {
  it("met à jour le nom", async () => {
    const dto = await useCase.execute({ codePays: "MA", nom: "Royaume du Maroc" });
    expect(dto.nom).toBe("Royaume du Maroc");
    expect(dto.codePays).toBe("MA");
    expect(dto.regionCode).toBe("NORD_AFRIQUE");
  });

  it("rejette nom vide (SPX-LIC-705)", async () => {
    await expect(useCase.execute({ codePays: "MA", nom: "" })).rejects.toMatchObject({
      code: "SPX-LIC-705",
    });
  });
});

describe("UpdatePaysUseCase — patch regionCode", () => {
  it("regionCode=string remplace", async () => {
    const dto = await useCase.execute({ codePays: "MA", regionCode: "AFRIQUE_OUEST" });
    expect(dto.regionCode).toBe("AFRIQUE_OUEST");
  });

  it("regionCode=null efface", async () => {
    const dto = await useCase.execute({ codePays: "MA", regionCode: null });
    expect(dto.regionCode).toBeNull();
  });

  it("regionCode absent (undefined) → inchangé", async () => {
    const dto = await useCase.execute({ codePays: "MA", nom: "Maroc bis" });
    expect(dto.regionCode).toBe("NORD_AFRIQUE");
  });
});

describe("UpdatePaysUseCase — erreurs", () => {
  it("throw NotFoundError SPX-LIC-703 si codePays inexistant", async () => {
    await expect(useCase.execute({ codePays: "ZZ", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-703",
    });
  });
});
