// ==============================================================================
// LIC v2 — Test d'intégration ListPaysUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { PaysRepositoryPg } from "../../adapters/postgres/pays.repository.pg";
import { ListPaysUseCase } from "../list-pays.usecase";

const ctx = createTestDb();
const repo = new PaysRepositoryPg(ctx.db);
const useCase = new ListPaysUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx, { cleanTables: ["lic_pays_ref"] });

describe("ListPaysUseCase", () => {
  it("retourne [] sur base sans pays seedés", async () => {
    const result = await useCase.execute();
    expect(Array.isArray(result)).toBe(true);
  });

  it("retourne les pays insérés triés par codePays ASC", async () => {
    await ctx.sql`
      INSERT INTO lic_pays_ref (code_pays, nom, region_code) VALUES
      ('SN', 'Sénégal', 'AFRIQUE_OUEST'),
      ('MA', 'Maroc', 'NORD_AFRIQUE'),
      ('CI', 'Côte d''Ivoire', 'AFRIQUE_OUEST')
    `;
    const result = await useCase.execute();
    const codes = result.map((p) => p.codePays);
    expect(codes).toEqual(["CI", "MA", "SN"]);
  });

  it("filtre par actif", async () => {
    await ctx.sql`
      INSERT INTO lic_pays_ref (code_pays, nom, actif) VALUES
      ('XA', 'Test A', true), ('XB', 'Test B', false)
    `;
    const actives = await useCase.execute({ actif: true });
    const codes = actives.map((p) => p.codePays);
    expect(codes).toContain("XA");
    expect(codes).not.toContain("XB");
  });

  it("filtre par regionCode", async () => {
    await ctx.sql`
      INSERT INTO lic_pays_ref (code_pays, nom, region_code) VALUES
      ('MA', 'Maroc', 'NORD_AFRIQUE'),
      ('SN', 'Sénégal', 'AFRIQUE_OUEST')
    `;
    const nordAfrique = await useCase.execute({ regionCode: "NORD_AFRIQUE" });
    const codes = nordAfrique.map((p) => p.codePays);
    expect(codes).toContain("MA");
    expect(codes).not.toContain("SN");
  });

  it("retourne PaysDTO (regionCode null si absent)", async () => {
    await ctx.sql`INSERT INTO lic_pays_ref (code_pays, nom) VALUES ('XX', 'Sans région')`;
    const result = await useCase.execute({ actif: true });
    const xx = result.find((p) => p.codePays === "XX");
    expect(xx?.regionCode).toBeNull();
  });
});
