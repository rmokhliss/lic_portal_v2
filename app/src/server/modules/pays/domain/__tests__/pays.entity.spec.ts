// Tests unitaires Pays (domain pur, aucune BD).

import { describe, expect, it } from "vitest";

import { Pays, PersistedPays, type CreatePaysInput } from "../pays.entity";

const VALID_INPUT: CreatePaysInput = {
  codePays: "MA",
  nom: "Maroc",
};

function captureThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e: unknown) {
    return e;
  }
  return undefined;
}

describe("Pays.create — cas nominaux", () => {
  it("retourne un Pays valide pour input minimal", () => {
    const p = Pays.create(VALID_INPUT);
    expect(p).toBeInstanceOf(Pays);
    expect(p.codePays).toBe("MA");
    expect(p.nom).toBe("Maroc");
    expect(p.regionCode).toBeUndefined();
    expect(p.actif).toBe(true);
  });

  it("accepte regionCode optionnel", () => {
    const p = Pays.create({ ...VALID_INPUT, regionCode: "NORD_AFRIQUE" });
    expect(p.regionCode).toBe("NORD_AFRIQUE");
  });

  it("respecte actif=false explicite", () => {
    const p = Pays.create({ ...VALID_INPUT, actif: false });
    expect(p.actif).toBe(false);
  });
});

describe("Pays.create — invariants throw SPX-LIC-705", () => {
  it.each<readonly [string, Partial<CreatePaysInput>]>([
    ["codePays vide", { codePays: "" }],
    ["codePays minuscules", { codePays: "ma" }],
    ["codePays 1 char", { codePays: "M" }],
    ["codePays 3 chars", { codePays: "MAR" }],
    ["codePays avec chiffre", { codePays: "M1" }],
    ["nom vide", { nom: "" }],
    ["nom > 100 chars", { nom: "x".repeat(101) }],
    ["regionCode chaîne vide", { regionCode: "" }],
    ["regionCode minuscules", { regionCode: "nord" }],
    ["regionCode > 50 chars", { regionCode: "A".repeat(51) }],
  ])("rejette quand %s", (_label, override) => {
    const thrown = captureThrown(() => Pays.create({ ...VALID_INPUT, ...override }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-705" });
  });
});

describe("Pays.rehydrate", () => {
  it("reconstruit une PersistedPays sans valider", () => {
    const date = new Date("2026-05-01T10:00:00Z");
    const p = Pays.rehydrate({
      id: 42,
      codePays: "MA",
      nom: "Maroc",
      regionCode: "NORD_AFRIQUE",
      actif: true,
      dateCreation: date,
    });
    expect(p).toBeInstanceOf(PersistedPays);
    expect(p.id).toBe(42);
    expect(p.dateCreation).toBe(date);
  });
});

describe("PersistedPays — mutations immuables", () => {
  const persisted = Pays.rehydrate({
    id: 1,
    codePays: "MA",
    nom: "Maroc",
    regionCode: "NORD_AFRIQUE",
    actif: true,
    dateCreation: new Date(),
  });

  it("withName renomme et conserve les autres champs", () => {
    const renamed = persisted.withName("Royaume du Maroc");
    expect(renamed.nom).toBe("Royaume du Maroc");
    expect(renamed.codePays).toBe("MA");
    expect(renamed.regionCode).toBe("NORD_AFRIQUE");
  });

  it("withRegionCode(string) remplace", () => {
    const u = persisted.withRegionCode("AFRIQUE_OUEST");
    expect(u.regionCode).toBe("AFRIQUE_OUEST");
  });

  it("withRegionCode(null) efface", () => {
    const u = persisted.withRegionCode(null);
    expect(u.regionCode).toBeUndefined();
  });

  it("withRegionCode rejette format invalide (SPX-LIC-705)", () => {
    const thrown = captureThrown(() => persisted.withRegionCode("invalid"));
    expect(thrown).toMatchObject({ code: "SPX-LIC-705" });
  });

  it("toggle bascule actif", () => {
    expect(persisted.toggle().actif).toBe(false);
    expect(persisted.toggle().toggle().actif).toBe(true);
  });
});

describe("toAuditSnapshot", () => {
  it("Pays inclut les 4 champs business", () => {
    const p = Pays.create({ ...VALID_INPUT, regionCode: "NORD_AFRIQUE" });
    expect(p.toAuditSnapshot()).toEqual({
      codePays: "MA",
      nom: "Maroc",
      regionCode: "NORD_AFRIQUE",
      actif: true,
    });
  });

  it("PersistedPays ajoute id", () => {
    const p = Pays.rehydrate({
      id: 7,
      codePays: "SN",
      nom: "Sénégal",
      actif: true,
      dateCreation: new Date(),
    });
    expect(p.toAuditSnapshot()).toMatchObject({ id: 7, regionCode: null });
  });
});
