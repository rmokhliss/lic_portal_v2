// ==============================================================================
// LIC v2 — Test d'intégration ToggleRegionUseCase (Phase 2.B étape 2/7)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { RegionRepositoryPg } from "../../adapters/postgres/region.repository.pg";
import { CreateRegionUseCase } from "../create-region.usecase";
import { ToggleRegionUseCase } from "../toggle-region.usecase";

const ctx = createTestDb();
const repo = new RegionRepositoryPg(ctx.db);
const createUseCase = new CreateRegionUseCase(repo);
const useCase = new ToggleRegionUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

beforeEach(async () => {
  await createUseCase.execute({
    regionCode: "TEST_TOG",
    nom: "Toggle target",
  });
});

describe("ToggleRegionUseCase — bascule", () => {
  it("première bascule : actif=true → false", async () => {
    const dto = await useCase.execute("TEST_TOG");
    expect(dto.actif).toBe(false);
  });

  it("deuxième bascule : actif=false → true", async () => {
    await useCase.execute("TEST_TOG");
    const dto = await useCase.execute("TEST_TOG");
    expect(dto.actif).toBe(true);
  });

  it("la bascule est persistée en BD", async () => {
    await useCase.execute("TEST_TOG");
    const rows = await ctx.sql<{ actif: boolean }[]>`
      SELECT actif FROM lic_regions_ref WHERE region_code = 'TEST_TOG'
    `;
    expect(rows[0]?.actif).toBe(false);
  });

  it("ne touche pas les autres champs", async () => {
    const dto = await useCase.execute("TEST_TOG");
    expect(dto.regionCode).toBe("TEST_TOG");
    expect(dto.nom).toBe("Toggle target");
    expect(dto.dmResponsable).toBeNull();
  });
});

describe("ToggleRegionUseCase — erreurs", () => {
  it("throw NotFoundError SPX-LIC-700 si regionCode inexistant", async () => {
    await expect(useCase.execute("INEXISTANT")).rejects.toMatchObject({
      code: "SPX-LIC-700",
    });
  });
});
