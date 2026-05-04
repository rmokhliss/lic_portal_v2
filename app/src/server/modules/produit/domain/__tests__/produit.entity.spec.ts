// Tests unitaires Produit (domain pur, aucune BD).

import { describe, expect, it } from "vitest";

import { PersistedProduit, Produit, type CreateProduitInput } from "../produit.entity";

const VALID: CreateProduitInput = { code: "SPX-CORE", nom: "SELECT-PX Core" };

function captured(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e: unknown) {
    return e;
  }
  return undefined;
}

describe("Produit.create — cas nominaux", () => {
  it("retourne un Produit valide pour input minimal", () => {
    const p = Produit.create(VALID);
    expect(p).toBeInstanceOf(Produit);
    expect(p.code).toBe("SPX-CORE");
    expect(p.nom).toBe("SELECT-PX Core");
    expect(p.description).toBeUndefined();
    expect(p.actif).toBe(true);
  });

  it("accepte description optionnelle", () => {
    const p = Produit.create({ ...VALID, description: "Module central" });
    expect(p.description).toBe("Module central");
  });

  it("respecte actif=false explicite", () => {
    const p = Produit.create({ ...VALID, actif: false });
    expect(p.actif).toBe(false);
  });
});

describe("Produit.create — invariants throw SPX-LIC-745", () => {
  it.each<readonly [string, Partial<CreateProduitInput>]>([
    ["code vide", { code: "" }],
    ["code minuscules", { code: "spx-core" }],
    ["code commence par chiffre", { code: "1SPX" }],
    ["code avec espaces", { code: "SPX CORE" }],
    ["code > 30 chars", { code: "A".repeat(31) }],
    ["nom vide", { nom: "" }],
    ["nom > 200 chars", { nom: "x".repeat(201) }],
    ["description vide", { description: "" }],
    ["description > 1000 chars", { description: "y".repeat(1001) }],
  ])("rejette quand %s", (_label, override) => {
    expect(captured(() => Produit.create({ ...VALID, ...override }))).toMatchObject({
      code: "SPX-LIC-745",
    });
  });
});

describe("PersistedProduit — mutations immuables", () => {
  const persisted = Produit.rehydrate({
    id: 1,
    code: "SPX-CORE",
    nom: "SELECT-PX Core",
    actif: true,
  });

  it("withName retourne une nouvelle instance", () => {
    const r = persisted.withName("Nouveau libellé");
    expect(r).not.toBe(persisted);
    expect(r.nom).toBe("Nouveau libellé");
    expect(r.code).toBe("SPX-CORE");
  });

  it("withDescription(null) efface la valeur", () => {
    const r = persisted.withDescription(null);
    expect(r.description).toBeUndefined();
  });

  it("toggle bascule actif", () => {
    const off = persisted.toggle();
    expect(off.actif).toBe(false);
    expect(persisted.actif).toBe(true);
  });
});

describe("toAuditSnapshot", () => {
  it("Produit inclut les 4 champs business", () => {
    const p = Produit.create({ ...VALID, description: "X" });
    expect(p.toAuditSnapshot()).toEqual({
      code: "SPX-CORE",
      nom: "SELECT-PX Core",
      description: "X",
      actif: true,
    });
  });

  it("PersistedProduit ajoute id en surcharge", () => {
    const p = Produit.rehydrate({ id: 7, code: "SPX-CORE", nom: "x", actif: true });
    expect(p.toAuditSnapshot()).toMatchObject({ id: 7 });
  });

  it("instanceof correct", () => {
    expect(Produit.rehydrate({ id: 1, code: "X", nom: "y", actif: true })).toBeInstanceOf(
      PersistedProduit,
    );
  });
});
