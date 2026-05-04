// ==============================================================================
// LIC v2 — Test d'intégration use-cases produit (Phase 6 étape 6.B)
//
// Pattern setupTransactionalTests : repo via ctx.db, use-cases sans
// db.transaction interne (pas d'audit, R-27).
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { ProduitRepositoryPg } from "../../adapters/postgres/produit.repository.pg";
import { CreateProduitUseCase } from "../create-produit.usecase";
import { GetProduitUseCase } from "../get-produit.usecase";
import { ListProduitsUseCase } from "../list-produits.usecase";
import { ToggleProduitUseCase } from "../toggle-produit.usecase";
import { UpdateProduitUseCase } from "../update-produit.usecase";

const ctx = createTestDb();
const repo = new ProduitRepositoryPg(ctx.db);
const create = new CreateProduitUseCase(repo);
const list = new ListProduitsUseCase(repo);
const get = new GetProduitUseCase(repo);
const update = new UpdateProduitUseCase(repo);
const toggle = new ToggleProduitUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("Produit CRUD use-cases", () => {
  it("create + list + get + update + toggle bout-en-bout", async () => {
    const created = await create.execute({
      code: "TEST-PROD",
      nom: "Produit de test",
      description: "Desc",
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.code).toBe("TEST-PROD");
    expect(created.actif).toBe(true);

    const all = await list.execute();
    expect(all.find((p) => p.code === "TEST-PROD")).toBeDefined();

    const fetched = await get.execute("TEST-PROD");
    expect(fetched.id).toBe(created.id);

    const updated = await update.execute({ code: "TEST-PROD", nom: "Renommé" });
    expect(updated.nom).toBe("Renommé");

    const toggled = await toggle.execute("TEST-PROD");
    expect(toggled.actif).toBe(false);
  });

  it("create rejette doublon code (SPX-LIC-744)", async () => {
    await create.execute({ code: "TEST-DUP", nom: "Premier" });
    await expect(create.execute({ code: "TEST-DUP", nom: "Doublon" })).rejects.toMatchObject({
      code: "SPX-LIC-744",
    });
  });

  it("get throw SPX-LIC-743 si absent", async () => {
    await expect(get.execute("INEXISTANT")).rejects.toMatchObject({ code: "SPX-LIC-743" });
  });

  it("update throw SPX-LIC-743 si absent", async () => {
    await expect(update.execute({ code: "INEXISTANT", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-743",
    });
  });

  it("filtre actif=false sur list", async () => {
    await create.execute({ code: "TEST-OFF", nom: "off", actif: false });
    const inactives = await list.execute({ actif: false });
    expect(inactives.every((p) => !p.actif)).toBe(true);
    expect(inactives.find((p) => p.code === "TEST-OFF")).toBeDefined();
  });
});
