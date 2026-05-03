// ==============================================================================
// LIC v2 — Test d'intégration UpdateTypeContactUseCase (Phase 2.B étape 3/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TypeContactRepositoryPg } from "../../adapters/postgres/type-contact.repository.pg";
import { UpdateTypeContactUseCase } from "../update-type-contact.usecase";

const ctx = createTestDb();
const repo = new TypeContactRepositoryPg(ctx.db);
const useCase = new UpdateTypeContactUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("UpdateTypeContactUseCase", () => {
  it("met à jour le libelle (TC seedé ACHAT)", async () => {
    const dto = await useCase.execute({ code: "ACHAT", libelle: "Service achats" });
    expect(dto.libelle).toBe("Service achats");
    expect(dto.code).toBe("ACHAT");
  });

  it("rejette libelle vide (SPX-LIC-714)", async () => {
    await expect(useCase.execute({ code: "ACHAT", libelle: "" })).rejects.toMatchObject({
      code: "SPX-LIC-714",
    });
  });

  it("throw NotFoundError SPX-LIC-712 si code inexistant", async () => {
    await expect(useCase.execute({ code: "ZZZ", libelle: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-712",
    });
  });
});
