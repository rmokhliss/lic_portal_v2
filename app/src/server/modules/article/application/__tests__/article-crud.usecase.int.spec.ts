// ==============================================================================
// LIC v2 — Test d'intégration use-cases article (Phase 6 étape 6.B)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { ProduitRepositoryPg } from "@/server/modules/produit/adapters/postgres/produit.repository.pg";
import { CreateProduitUseCase } from "@/server/modules/produit/application/create-produit.usecase";

import { ArticleRepositoryPg } from "../../adapters/postgres/article.repository.pg";
import { CreateArticleUseCase } from "../create-article.usecase";
import { GetArticleUseCase } from "../get-article.usecase";
import { ListArticlesUseCase } from "../list-articles.usecase";
import { ToggleArticleUseCase } from "../toggle-article.usecase";
import { UpdateArticleUseCase } from "../update-article.usecase";

const ctx = createTestDb();
const articleRepo = new ArticleRepositoryPg(ctx.db);
const produitRepo = new ProduitRepositoryPg(ctx.db);
const createProd = new CreateProduitUseCase(produitRepo);
const create = new CreateArticleUseCase(articleRepo, produitRepo);
const list = new ListArticlesUseCase(articleRepo);
const get = new GetArticleUseCase(articleRepo);
const update = new UpdateArticleUseCase(articleRepo);
const toggle = new ToggleArticleUseCase(articleRepo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

let produitId: number;

beforeEach(async () => {
  const p = await createProd.execute({ code: "TEST-PROD-ART", nom: "Pour articles" });
  produitId = p.id;
});

describe("Article CRUD use-cases", () => {
  it("create + list + get + update + toggle bout-en-bout", async () => {
    const created = await create.execute({
      produitId,
      code: "USERS",
      nom: "Utilisateurs",
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.uniteVolume).toBe("transactions");

    const all = await list.execute({ produitId });
    expect(all.find((a) => a.code === "USERS")).toBeDefined();

    const fetched = await get.execute(created.id);
    expect(fetched.code).toBe("USERS");

    const updated = await update.execute({ id: created.id, nom: "Renommé", uniteVolume: "Mo" });
    expect(updated.nom).toBe("Renommé");
    expect(updated.uniteVolume).toBe("Mo");

    const toggled = await toggle.execute(created.id);
    expect(toggled.actif).toBe(false);
  });

  it("create rejette si produit inexistant (SPX-LIC-743)", async () => {
    await expect(create.execute({ produitId: 99999, code: "X", nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-743",
    });
  });

  it("create rejette doublon (produitId, code) — SPX-LIC-747", async () => {
    await create.execute({ produitId, code: "DUP", nom: "Premier" });
    await expect(create.execute({ produitId, code: "DUP", nom: "Doublon" })).rejects.toMatchObject({
      code: "SPX-LIC-747",
    });
  });

  it("get throw SPX-LIC-746 si id absent", async () => {
    await expect(get.execute(999999)).rejects.toMatchObject({ code: "SPX-LIC-746" });
  });
});
