// ==============================================================================
// LIC v2 — Test d'intégration ListLanguesUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { LangueRepositoryPg } from "../../adapters/postgres/langue.repository.pg";
import { ListLanguesUseCase } from "../list-langues.usecase";

const ctx = createTestDb();
const repo = new LangueRepositoryPg(ctx.db);
const useCase = new ListLanguesUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("ListLanguesUseCase", () => {
  it("retourne les 2 langues seedées (en, fr) triées ASC", async () => {
    const result = await useCase.execute();
    const codes = result.map((l) => l.codeLangue);
    expect(codes).toEqual(expect.arrayContaining(["en", "fr"]));
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
  });

  it("filtre par actif", async () => {
    await ctx.sql`INSERT INTO lic_langues_ref (code_langue, nom, actif) VALUES ('xx', 'Test', false)`;
    const actives = await useCase.execute({ actif: true });
    expect(actives.find((l) => l.codeLangue === "xx")).toBeUndefined();
  });
});
