// ==============================================================================
// LIC v2 — Test d'intégration GetPaysUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { PaysRepositoryPg } from "../../adapters/postgres/pays.repository.pg";
import { GetPaysUseCase } from "../get-pays.usecase";

const ctx = createTestDb();
const repo = new PaysRepositoryPg(ctx.db);
const useCase = new GetPaysUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("GetPaysUseCase", () => {
  it("retourne le pays par codePays", async () => {
    await ctx.sql`INSERT INTO lic_pays_ref (code_pays, nom, region_code) VALUES ('MA', 'Maroc', 'NORD_AFRIQUE')`;
    const result = await useCase.execute("MA");
    expect(result.codePays).toBe("MA");
    expect(result.nom).toBe("Maroc");
    expect(result.regionCode).toBe("NORD_AFRIQUE");
  });

  it("throw NotFoundError SPX-LIC-703 si codePays inexistant", async () => {
    await expect(useCase.execute("ZZ")).rejects.toMatchObject({ code: "SPX-LIC-703" });
  });

  it("throw ValidationError SPX-LIC-705 si codePays vide", async () => {
    await expect(useCase.execute("")).rejects.toMatchObject({ code: "SPX-LIC-705" });
  });

  it("throw ValidationError SPX-LIC-705 si codePays minuscule", async () => {
    await expect(useCase.execute("ma")).rejects.toMatchObject({ code: "SPX-LIC-705" });
  });

  it("throw ValidationError SPX-LIC-705 si codePays > 2 chars", async () => {
    await expect(useCase.execute("MAR")).rejects.toMatchObject({ code: "SPX-LIC-705" });
  });
});
