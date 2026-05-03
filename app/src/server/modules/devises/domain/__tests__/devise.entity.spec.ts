// Tests unitaires Devise (domain pur, aucune BD).

import { describe, expect, it } from "vitest";

import { Devise, PersistedDevise, type CreateDeviseInput } from "../devise.entity";

const VALID_INPUT: CreateDeviseInput = { codeDevise: "EUR", nom: "Euro" };

function captureThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e: unknown) {
    return e;
  }
  return undefined;
}

describe("Devise.create — cas nominaux", () => {
  it("retourne une Devise valide pour input minimal", () => {
    const d = Devise.create(VALID_INPUT);
    expect(d.codeDevise).toBe("EUR");
    expect(d.nom).toBe("Euro");
    expect(d.symbole).toBeUndefined();
    expect(d.actif).toBe(true);
  });

  it("accepte symbole optionnel", () => {
    const d = Devise.create({ ...VALID_INPUT, symbole: "€" });
    expect(d.symbole).toBe("€");
  });

  it("accepte codes legacy XOF/XAF (4 chars)", () => {
    expect(Devise.create({ codeDevise: "XOF", nom: "F CFA" }).codeDevise).toBe("XOF");
    expect(Devise.create({ codeDevise: "XAF", nom: "F CFA" }).codeDevise).toBe("XAF");
  });
});

describe("Devise.create — invariants throw SPX-LIC-708", () => {
  it.each<readonly [string, Partial<CreateDeviseInput>]>([
    ["codeDevise vide", { codeDevise: "" }],
    ["codeDevise minuscules", { codeDevise: "eur" }],
    ["codeDevise 2 chars", { codeDevise: "EU" }],
    ["codeDevise > 10 chars", { codeDevise: "A".repeat(11) }],
    ["codeDevise avec chiffre", { codeDevise: "EU1" }],
    ["nom vide", { nom: "" }],
    ["nom > 100 chars", { nom: "x".repeat(101) }],
    ["symbole chaîne vide", { symbole: "" }],
    ["symbole > 10 chars", { symbole: "x".repeat(11) }],
  ])("rejette quand %s", (_label, override) => {
    const thrown = captureThrown(() => Devise.create({ ...VALID_INPUT, ...override }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-708" });
  });
});

describe("Devise.rehydrate", () => {
  it("reconstruit une PersistedDevise sans valider", () => {
    const d = Devise.rehydrate({
      id: 42,
      codeDevise: "MAD",
      nom: "Dirham marocain",
      symbole: "DH",
      actif: true,
    });
    expect(d).toBeInstanceOf(PersistedDevise);
    expect(d.id).toBe(42);
  });
});

describe("PersistedDevise — mutations immuables", () => {
  const persisted = Devise.rehydrate({
    id: 1,
    codeDevise: "MAD",
    nom: "Dirham marocain",
    symbole: "DH",
    actif: true,
  });

  it("withName renomme", () => {
    expect(persisted.withName("Dirham").nom).toBe("Dirham");
  });

  it("withSymbole(string) remplace", () => {
    expect(persisted.withSymbole("MAD").symbole).toBe("MAD");
  });

  it("withSymbole(null) efface", () => {
    expect(persisted.withSymbole(null).symbole).toBeUndefined();
  });

  it("withSymbole rejette chaîne vide (SPX-LIC-708)", () => {
    const thrown = captureThrown(() => persisted.withSymbole(""));
    expect(thrown).toMatchObject({ code: "SPX-LIC-708" });
  });

  it("toggle bascule actif", () => {
    expect(persisted.toggle().actif).toBe(false);
    expect(persisted.toggle().toggle().actif).toBe(true);
  });
});

describe("toAuditSnapshot", () => {
  it("Devise inclut les 4 champs", () => {
    const d = Devise.create({ ...VALID_INPUT, symbole: "€" });
    expect(d.toAuditSnapshot()).toEqual({
      codeDevise: "EUR",
      nom: "Euro",
      symbole: "€",
      actif: true,
    });
  });

  it("PersistedDevise ajoute id", () => {
    const d = Devise.rehydrate({ id: 7, codeDevise: "USD", nom: "$", actif: true });
    expect(d.toAuditSnapshot()).toMatchObject({ id: 7 });
  });
});
