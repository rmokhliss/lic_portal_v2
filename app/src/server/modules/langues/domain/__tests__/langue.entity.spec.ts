// Tests unitaires Langue (domain pur, aucune BD).

import { describe, expect, it } from "vitest";

import { Langue, PersistedLangue, type CreateLangueInput } from "../langue.entity";

const VALID_INPUT: CreateLangueInput = { codeLangue: "fr", nom: "Français" };

function captureThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e: unknown) {
    return e;
  }
  return undefined;
}

describe("Langue.create — cas nominaux", () => {
  it("retourne une Langue valide pour input minimal", () => {
    const l = Langue.create(VALID_INPUT);
    expect(l.codeLangue).toBe("fr");
    expect(l.nom).toBe("Français");
    expect(l.actif).toBe(true);
  });

  it("accepte des codes 2 à 5 chars (en, ar, ber, zh-cn → 5 max)", () => {
    expect(Langue.create({ codeLangue: "en", nom: "English" }).codeLangue).toBe("en");
    expect(Langue.create({ codeLangue: "ar", nom: "Arabe" }).codeLangue).toBe("ar");
    expect(Langue.create({ codeLangue: "zhcn", nom: "Chinois" }).codeLangue).toBe("zhcn");
  });
});

describe("Langue.create — invariants throw SPX-LIC-711", () => {
  it.each<readonly [string, Partial<CreateLangueInput>]>([
    ["codeLangue vide", { codeLangue: "" }],
    ["codeLangue MAJUSCULE", { codeLangue: "FR" }],
    ["codeLangue 1 char", { codeLangue: "f" }],
    ["codeLangue > 5 chars", { codeLangue: "abcdef" }],
    ["codeLangue avec chiffre", { codeLangue: "fr1" }],
    ["codeLangue avec tiret", { codeLangue: "fr-fr" }],
    ["nom vide", { nom: "" }],
    ["nom > 100 chars", { nom: "x".repeat(101) }],
  ])("rejette quand %s", (_label, override) => {
    const thrown = captureThrown(() => Langue.create({ ...VALID_INPUT, ...override }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-711" });
  });
});

describe("Langue.rehydrate", () => {
  it("reconstruit une PersistedLangue", () => {
    const l = Langue.rehydrate({ id: 42, codeLangue: "fr", nom: "Français", actif: true });
    expect(l).toBeInstanceOf(PersistedLangue);
    expect(l.id).toBe(42);
  });
});

describe("PersistedLangue — mutations", () => {
  const persisted = Langue.rehydrate({ id: 1, codeLangue: "fr", nom: "Français", actif: true });

  it("withName renomme", () => {
    expect(persisted.withName("French").nom).toBe("French");
  });

  it("withName rejette nom invalide", () => {
    const thrown = captureThrown(() => persisted.withName(""));
    expect(thrown).toMatchObject({ code: "SPX-LIC-711" });
  });

  it("toggle bascule actif", () => {
    expect(persisted.toggle().actif).toBe(false);
  });
});

describe("toAuditSnapshot", () => {
  it("inclut id pour PersistedLangue", () => {
    const l = Langue.rehydrate({ id: 7, codeLangue: "en", nom: "English", actif: true });
    expect(l.toAuditSnapshot()).toMatchObject({ id: 7, codeLangue: "en" });
  });
});
