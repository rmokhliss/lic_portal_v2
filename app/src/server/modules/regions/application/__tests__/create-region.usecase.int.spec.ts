// ==============================================================================
// LIC v2 — Test d'intégration CreateRegionUseCase (Phase 2.B étape 2/7)
//
// Pattern setupTransactionalTests : repo et use-case opèrent via ctx.db,
// qui partage la connexion ctx.sql sur laquelle BEGIN/ROLLBACK est émis.
// Le use-case n'ouvre PAS de db.transaction() interne (cf. décision étape 2 :
// pas d'audit sur refs → pas de transaction nécessaire), donc tout reste
// dans le BEGIN racine → ROLLBACK afterEach annule tout.
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { RegionRepositoryPg } from "../../adapters/postgres/region.repository.pg";
import { CreateRegionUseCase } from "../create-region.usecase";

const ctx = createTestDb();
const repo = new RegionRepositoryPg(ctx.db);
const useCase = new CreateRegionUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("CreateRegionUseCase — cas nominaux", () => {
  it("INSERT une région et retourne le DTO avec id + dateCreation BD", async () => {
    const dto = await useCase.execute({
      regionCode: "TEST_REGION",
      nom: "Région de test",
      dmResponsable: "Alice DUPONT",
    });

    expect(dto.regionCode).toBe("TEST_REGION");
    expect(dto.nom).toBe("Région de test");
    expect(dto.dmResponsable).toBe("Alice DUPONT");
    expect(dto.actif).toBe(true);
    expect(typeof dto.id).toBe("number");
    expect(dto.id).toBeGreaterThan(0);
    expect(typeof dto.dateCreation).toBe("string");
    expect(new Date(dto.dateCreation).toString()).not.toBe("Invalid Date");
  });

  it("dmResponsable optionnel → null dans le DTO", async () => {
    const dto = await useCase.execute({
      regionCode: "TEST_NO_DM",
      nom: "Sans DM",
    });
    expect(dto.dmResponsable).toBeNull();
  });

  it("actif=false explicite (cas seed/import)", async () => {
    const dto = await useCase.execute({
      regionCode: "TEST_INACTIVE",
      nom: "Inactive dès création",
      actif: false,
    });
    expect(dto.actif).toBe(false);
  });

  it("la région créée est lisible immédiatement via SELECT", async () => {
    await useCase.execute({ regionCode: "TEST_VISIBLE", nom: "Visible" });
    const rows = await ctx.sql<{ region_code: string }[]>`
      SELECT region_code FROM lic_regions_ref WHERE region_code = 'TEST_VISIBLE'
    `;
    expect(rows).toHaveLength(1);
  });
});

describe("CreateRegionUseCase — invariants domain (SPX-LIC-702)", () => {
  it("rejette regionCode vide AVANT requête BD", async () => {
    await expect(useCase.execute({ regionCode: "", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-702",
    });
  });

  it("rejette regionCode minuscules", async () => {
    await expect(useCase.execute({ regionCode: "test", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-702",
    });
  });

  it("rejette nom > 100 chars", async () => {
    await expect(
      useCase.execute({ regionCode: "TEST", nom: "x".repeat(101) }),
    ).rejects.toMatchObject({ code: "SPX-LIC-702" });
  });
});

describe("CreateRegionUseCase — conflit unicité (SPX-LIC-701)", () => {
  it("throw ConflictError si regionCode existe déjà (seed bootstrap)", async () => {
    await expect(
      useCase.execute({ regionCode: "NORD_AFRIQUE", nom: "Doublon" }),
    ).rejects.toMatchObject({ code: "SPX-LIC-701" });
  });

  it("throw ConflictError si regionCode créé par le test précédent", async () => {
    await useCase.execute({ regionCode: "TEST_DUP", nom: "Premier" });
    await expect(useCase.execute({ regionCode: "TEST_DUP", nom: "Doublon" })).rejects.toMatchObject(
      { code: "SPX-LIC-701" },
    );
  });

  it("rollback : aucune région partielle persistée si conflit (transaction)", async () => {
    await useCase.execute({ regionCode: "TEST_TX", nom: "Premier" });
    await expect(useCase.execute({ regionCode: "TEST_TX", nom: "Doublon" })).rejects.toMatchObject({
      code: "SPX-LIC-701",
    });
    const rows = await ctx.sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM lic_regions_ref WHERE region_code = 'TEST_TX'
    `;
    expect(rows[0]?.count).toBe("1");
  });
});
