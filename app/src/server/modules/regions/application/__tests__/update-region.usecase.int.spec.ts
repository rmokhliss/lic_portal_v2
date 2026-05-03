// ==============================================================================
// LIC v2 — Test d'intégration UpdateRegionUseCase (Phase 2.B étape 2/7)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { RegionRepositoryPg } from "../../adapters/postgres/region.repository.pg";
import { CreateRegionUseCase } from "../create-region.usecase";
import { UpdateRegionUseCase } from "../update-region.usecase";

const ctx = createTestDb();
const repo = new RegionRepositoryPg(ctx.db);
const createUseCase = new CreateRegionUseCase(repo);
const useCase = new UpdateRegionUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

beforeEach(async () => {
  // Région fixture créée dans la transaction du test (rollback automatique).
  await createUseCase.execute({
    regionCode: "TEST_UPD",
    nom: "Initial",
    dmResponsable: "Alice DUPONT",
  });
});

describe("UpdateRegionUseCase — patch nom", () => {
  it("met à jour le nom et conserve les autres champs", async () => {
    const dto = await useCase.execute({ regionCode: "TEST_UPD", nom: "Renommée" });
    expect(dto.nom).toBe("Renommée");
    expect(dto.regionCode).toBe("TEST_UPD");
    expect(dto.dmResponsable).toBe("Alice DUPONT");
  });

  it("BD reflète le nouveau nom", async () => {
    await useCase.execute({ regionCode: "TEST_UPD", nom: "Renommée" });
    const rows = await ctx.sql<{ nom: string }[]>`
      SELECT nom FROM lic_regions_ref WHERE region_code = 'TEST_UPD'
    `;
    expect(rows[0]?.nom).toBe("Renommée");
  });

  it("rejette nom vide (SPX-LIC-702 via withName)", async () => {
    await expect(useCase.execute({ regionCode: "TEST_UPD", nom: "" })).rejects.toMatchObject({
      code: "SPX-LIC-702",
    });
  });
});

describe("UpdateRegionUseCase — patch dmResponsable", () => {
  it("dmResponsable=string → remplace", async () => {
    const dto = await useCase.execute({
      regionCode: "TEST_UPD",
      dmResponsable: "Bob MARTIN",
    });
    expect(dto.dmResponsable).toBe("Bob MARTIN");
  });

  it("dmResponsable=null → efface (BD reçoit NULL)", async () => {
    const dto = await useCase.execute({ regionCode: "TEST_UPD", dmResponsable: null });
    expect(dto.dmResponsable).toBeNull();

    const rows = await ctx.sql<{ dm_responsable: string | null }[]>`
      SELECT dm_responsable FROM lic_regions_ref WHERE region_code = 'TEST_UPD'
    `;
    expect(rows[0]?.dm_responsable).toBeNull();
  });

  it("dmResponsable absent (undefined) → inchangé", async () => {
    const dto = await useCase.execute({ regionCode: "TEST_UPD", nom: "Renommée" });
    expect(dto.dmResponsable).toBe("Alice DUPONT");
  });
});

describe("UpdateRegionUseCase — combinaisons + erreurs", () => {
  it("met à jour nom et dmResponsable simultanément", async () => {
    const dto = await useCase.execute({
      regionCode: "TEST_UPD",
      nom: "Renommée",
      dmResponsable: "Bob MARTIN",
    });
    expect(dto.nom).toBe("Renommée");
    expect(dto.dmResponsable).toBe("Bob MARTIN");
  });

  it("throw NotFoundError SPX-LIC-700 si regionCode inexistant", async () => {
    await expect(useCase.execute({ regionCode: "INEXISTANT", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-700",
    });
  });

  it("ne touche pas regionCode (immuable, pas de paramètre)", async () => {
    await useCase.execute({ regionCode: "TEST_UPD", nom: "Renommée" });
    const rows = await ctx.sql<{ region_code: string }[]>`
      SELECT region_code FROM lic_regions_ref WHERE id = (
        SELECT id FROM lic_regions_ref WHERE region_code = 'TEST_UPD'
      )
    `;
    expect(rows[0]?.region_code).toBe("TEST_UPD");
  });
});
