// ==============================================================================
// LIC v2 — Test d'intégration ListDevisesUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { DeviseRepositoryPg } from "../../adapters/postgres/devise.repository.pg";
import { ListDevisesUseCase } from "../list-devises.usecase";

const ctx = createTestDb();
const repo = new DeviseRepositoryPg(ctx.db);
const useCase = new ListDevisesUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("ListDevisesUseCase", () => {
  it("retourne les 5 devises seedées par bootstrap, triées par codeDevise", async () => {
    const result = await useCase.execute();
    const codes = result.map((d) => d.codeDevise);
    expect(codes).toEqual(expect.arrayContaining(["EUR", "MAD", "USD", "XAF", "XOF"]));
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
  });

  it("filtre par actif=true exclut les inactives", async () => {
    await ctx.sql`
      INSERT INTO lic_devises_ref (code_devise, nom, actif) VALUES ('TEST', 'Test', false)
    `;
    const actives = await useCase.execute({ actif: true });
    expect(actives.find((d) => d.codeDevise === "TEST")).toBeUndefined();
  });

  it("DTO contient symbole=null si absent en BD", async () => {
    await ctx.sql`INSERT INTO lic_devises_ref (code_devise, nom) VALUES ('NOSYM', 'Sans symbole')`;
    const result = await useCase.execute();
    const nosym = result.find((d) => d.codeDevise === "NOSYM");
    expect(nosym?.symbole).toBeNull();
  });
});
