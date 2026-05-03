// Tests unitaires TypeContact (domain pur, aucune BD).

import { describe, expect, it } from "vitest";

import {
  PersistedTypeContact,
  TypeContact,
  type CreateTypeContactInput,
} from "../type-contact.entity";

const VALID_INPUT: CreateTypeContactInput = { code: "ACHAT", libelle: "Achats" };

function captureThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e: unknown) {
    return e;
  }
  return undefined;
}

describe("TypeContact.create — cas nominaux", () => {
  it("retourne un TypeContact valide pour input minimal", () => {
    const tc = TypeContact.create(VALID_INPUT);
    expect(tc.code).toBe("ACHAT");
    expect(tc.libelle).toBe("Achats");
    expect(tc.actif).toBe(true);
  });

  it("accepte des codes 1 à 30 chars MAJUSCULE_UNDERSCORE", () => {
    expect(TypeContact.create({ code: "FACTURATION", libelle: "x" }).code).toBe("FACTURATION");
    expect(TypeContact.create({ code: "TECH_2", libelle: "x" }).code).toBe("TECH_2");
  });
});

describe("TypeContact.create — invariants throw SPX-LIC-714", () => {
  it.each<readonly [string, Partial<CreateTypeContactInput>]>([
    ["code vide", { code: "" }],
    ["code minuscules", { code: "achat" }],
    ["code commence par chiffre", { code: "1ACHAT" }],
    ["code avec espace", { code: "ACHAT FACTU" }],
    ["code > 30 chars", { code: "A".repeat(31) }],
    ["libelle vide", { libelle: "" }],
    ["libelle > 100 chars", { libelle: "x".repeat(101) }],
  ])("rejette quand %s", (_label, override) => {
    const thrown = captureThrown(() => TypeContact.create({ ...VALID_INPUT, ...override }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-714" });
  });
});

describe("TypeContact.rehydrate", () => {
  it("reconstruit une PersistedTypeContact", () => {
    const tc = TypeContact.rehydrate({ id: 42, code: "ACHAT", libelle: "Achats", actif: true });
    expect(tc).toBeInstanceOf(PersistedTypeContact);
    expect(tc.id).toBe(42);
  });
});

describe("PersistedTypeContact — mutations", () => {
  const persisted = TypeContact.rehydrate({
    id: 1,
    code: "ACHAT",
    libelle: "Achats",
    actif: true,
  });

  it("withLibelle remplace le libelle", () => {
    expect(persisted.withLibelle("Service achats").libelle).toBe("Service achats");
  });

  it("withLibelle rejette libelle vide (SPX-LIC-714)", () => {
    const thrown = captureThrown(() => persisted.withLibelle(""));
    expect(thrown).toMatchObject({ code: "SPX-LIC-714" });
  });

  it("toggle bascule actif", () => {
    expect(persisted.toggle().actif).toBe(false);
    expect(persisted.toggle().toggle().actif).toBe(true);
  });
});

describe("toAuditSnapshot", () => {
  it("inclut id pour PersistedTypeContact", () => {
    const tc = TypeContact.rehydrate({ id: 7, code: "TECH", libelle: "Technique", actif: true });
    expect(tc.toAuditSnapshot()).toEqual({
      id: 7,
      code: "TECH",
      libelle: "Technique",
      actif: true,
    });
  });
});
