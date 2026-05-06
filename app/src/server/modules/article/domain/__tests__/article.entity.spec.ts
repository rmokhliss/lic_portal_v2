// Tests unitaires Article (domain pur, aucune BD).

import { describe, expect, it } from "vitest";

import { Article, PersistedArticle, type CreateArticleInput } from "../article.entity";

const VALID: CreateArticleInput = { produitId: 1, code: "USERS", nom: "Utilisateurs" };

function captured(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e: unknown) {
    return e;
  }
  return undefined;
}

describe("Article.create — cas nominaux", () => {
  it("retourne un Article avec uniteVolume='transactions' par défaut", () => {
    const a = Article.create(VALID);
    expect(a.produitId).toBe(1);
    expect(a.code).toBe("USERS");
    expect(a.uniteVolume).toBe("transactions");
    expect(a.actif).toBe(true);
  });

  it("respecte uniteVolume explicite", () => {
    const a = Article.create({ ...VALID, uniteVolume: "Mo" });
    expect(a.uniteVolume).toBe("Mo");
  });
});

describe("Article.create — invariants throw SPX-LIC-748", () => {
  it.each<readonly [string, Partial<CreateArticleInput>]>([
    ["produitId 0", { produitId: 0 }],
    ["produitId négatif", { produitId: -1 }],
    ["produitId non-entier", { produitId: 1.5 }],
    ["code vide", { code: "" }],
    ["code minuscules", { code: "users" }],
    ["nom vide", { nom: "" }],
    ["nom > 200 chars", { nom: "x".repeat(201) }],
    ["uniteVolume vide", { uniteVolume: "" }],
    ["uniteVolume > 30 chars", { uniteVolume: "z".repeat(31) }],
  ])("rejette quand %s", (_label, override) => {
    expect(captured(() => Article.create({ ...VALID, ...override }))).toMatchObject({
      code: "SPX-LIC-748",
    });
  });
});

describe("PersistedArticle — mutations immuables", () => {
  const persisted = Article.rehydrate({
    id: 1,
    produitId: 2,
    code: "USERS",
    nom: "Utilisateurs",
    uniteVolume: "transactions",
    actif: true,
  });

  it("withName change nom", () => {
    expect(persisted.withName("Nouveau").nom).toBe("Nouveau");
  });

  it("withUniteVolume change unite", () => {
    expect(persisted.withUniteVolume("Mo").uniteVolume).toBe("Mo");
  });

  it("toggle bascule actif", () => {
    expect(persisted.toggle().actif).toBe(false);
  });

  it("instanceof PersistedArticle", () => {
    expect(persisted).toBeInstanceOf(PersistedArticle);
  });
});

describe("toAuditSnapshot", () => {
  // Phase 19 R-13 — controleVolume ajouté au snapshot (default true).
  it("Article inclut les 7 champs business", () => {
    const a = Article.create(VALID);
    expect(a.toAuditSnapshot()).toEqual({
      produitId: 1,
      code: "USERS",
      nom: "Utilisateurs",
      description: null,
      uniteVolume: "transactions",
      actif: true,
      controleVolume: true,
    });
  });
});
