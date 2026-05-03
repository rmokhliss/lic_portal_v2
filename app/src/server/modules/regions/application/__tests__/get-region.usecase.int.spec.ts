// ==============================================================================
// LIC v2 — Test d'intégration GetRegionUseCase (Phase 2.B étape 2/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { RegionRepositoryPg } from "../../adapters/postgres/region.repository.pg";
import { GetRegionUseCase } from "../get-region.usecase";

const ctx = createTestDb();
const repo = new RegionRepositoryPg(ctx.db);
const useCase = new GetRegionUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("GetRegionUseCase — cas nominaux", () => {
  it("retourne la région seedée par regionCode", async () => {
    const result = await useCase.execute("NORD_AFRIQUE");
    expect(result.regionCode).toBe("NORD_AFRIQUE");
    expect(result.nom).toBe("Afrique du Nord");
    expect(result.actif).toBe(true);
  });
});

describe("GetRegionUseCase — erreurs", () => {
  it("throw NotFoundError SPX-LIC-700 si regionCode inexistant", async () => {
    await expect(useCase.execute("INEXISTANT")).rejects.toMatchObject({
      code: "SPX-LIC-700",
    });
  });

  it("throw ValidationError SPX-LIC-702 si regionCode vide (sans requête BD)", async () => {
    await expect(useCase.execute("")).rejects.toMatchObject({
      code: "SPX-LIC-702",
    });
  });

  it("throw ValidationError SPX-LIC-702 si regionCode minuscules", async () => {
    await expect(useCase.execute("nord_afrique")).rejects.toMatchObject({
      code: "SPX-LIC-702",
    });
  });

  it("throw ValidationError SPX-LIC-702 si regionCode > 50 chars", async () => {
    await expect(useCase.execute("X".repeat(51))).rejects.toMatchObject({
      code: "SPX-LIC-702",
    });
  });
});
