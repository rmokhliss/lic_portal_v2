// ==============================================================================
// LIC v2 — Test d'intégration ListRegionsUseCase (Phase 2.B étape 2/7)
//
// Pattern BEGIN/ROLLBACK via test-helpers (cf. setupTransactionalTests).
// Use-case read-only : pas de transaction interne, le repo participe au
// BEGIN/ROLLBACK du test via la DI ctx.db.
//
// Note : la migration 0003 a seedé 3 régions (NORD_AFRIQUE, AFRIQUE_OUEST,
// AFRIQUE_CENTRALE). Les tests les voient comme "fixture initiale", on
// teste l'effet des INSERT/UPDATE additionnels en relatif.
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { RegionRepositoryPg } from "../../adapters/postgres/region.repository.pg";
import { ListRegionsUseCase } from "../list-regions.usecase";

const ctx = createTestDb();
const repo = new RegionRepositoryPg(ctx.db);
const useCase = new ListRegionsUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("ListRegionsUseCase — sans filtre", () => {
  it("retourne toutes les régions seedées par bootstrap", async () => {
    const result = await useCase.execute();
    const codes = result.map((r) => r.regionCode);
    expect(codes).toEqual(
      expect.arrayContaining(["NORD_AFRIQUE", "AFRIQUE_OUEST", "AFRIQUE_CENTRALE"]),
    );
  });

  it("retourne les régions triées par regionCode ASC", async () => {
    const result = await useCase.execute();
    const codes = result.map((r) => r.regionCode);
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
  });

  it("inclut les régions inactives", async () => {
    // Insère une région inactive directement via repo (les use-cases mutants
    // sont testés ailleurs).
    await ctx.sql`
      INSERT INTO lic_regions_ref (region_code, nom, actif)
      VALUES ('TEST_INACTIVE', 'Test inactive', false)
    `;
    const result = await useCase.execute();
    const inactive = result.find((r) => r.regionCode === "TEST_INACTIVE");
    expect(inactive).toBeDefined();
    expect(inactive?.actif).toBe(false);
  });
});

describe("ListRegionsUseCase — filtre actif", () => {
  it("actif=true → exclut les inactives", async () => {
    await ctx.sql`
      INSERT INTO lic_regions_ref (region_code, nom, actif)
      VALUES ('TEST_INACTIVE_2', 'Test inactive 2', false)
    `;
    const result = await useCase.execute({ actif: true });
    expect(result.every((r) => r.actif)).toBe(true);
    expect(result.find((r) => r.regionCode === "TEST_INACTIVE_2")).toBeUndefined();
  });

  it("actif=false → seulement les inactives", async () => {
    await ctx.sql`
      INSERT INTO lic_regions_ref (region_code, nom, actif)
      VALUES ('TEST_INACTIVE_3', 'Test inactive 3', false)
    `;
    const result = await useCase.execute({ actif: false });
    expect(result.every((r) => !r.actif)).toBe(true);
    expect(result.find((r) => r.regionCode === "TEST_INACTIVE_3")).toBeDefined();
  });
});

describe("ListRegionsUseCase — DTO output", () => {
  it("retourne RegionDTO (dateCreation ISO string, dmResponsable null si absent)", async () => {
    const result = await useCase.execute();
    const sample = result[0];
    expect(sample).toBeDefined();
    expect(typeof sample?.id).toBe("number");
    expect(typeof sample?.regionCode).toBe("string");
    expect(typeof sample?.dateCreation).toBe("string");
    // ISO 8601 valide parsable
    expect(new Date(sample?.dateCreation ?? "").toString()).not.toBe("Invalid Date");
    // dmResponsable null (jamais undefined dans le DTO)
    expect(sample?.dmResponsable === null || typeof sample?.dmResponsable === "string").toBe(true);
  });
});
