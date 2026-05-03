// Tests unitaires Region (domain pur, aucune BD).

import { describe, expect, it } from "vitest";

import { PersistedRegion, Region, type CreateRegionInput } from "../region.entity";

const VALID_INPUT: CreateRegionInput = {
  regionCode: "NORD_AFRIQUE",
  nom: "Afrique du Nord",
};

function captureThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e: unknown) {
    return e;
  }
  return undefined;
}

describe("Region.create — cas nominaux", () => {
  it("retourne une Region valide pour input minimal", () => {
    const r = Region.create(VALID_INPUT);
    expect(r).toBeInstanceOf(Region);
    expect(r.regionCode).toBe("NORD_AFRIQUE");
    expect(r.nom).toBe("Afrique du Nord");
    expect(r.dmResponsable).toBeUndefined();
    expect(r.actif).toBe(true);
  });

  it("accepte dmResponsable optionnel", () => {
    const r = Region.create({ ...VALID_INPUT, dmResponsable: "Alice DUPONT" });
    expect(r.dmResponsable).toBe("Alice DUPONT");
  });

  it("respecte actif=false explicite (cas seed import)", () => {
    const r = Region.create({ ...VALID_INPUT, actif: false });
    expect(r.actif).toBe(false);
  });
});

describe("Region.create — invariants throw SPX-LIC-702", () => {
  it.each<readonly [string, Partial<CreateRegionInput>]>([
    ["regionCode vide", { regionCode: "" }],
    ["nom vide", { nom: "" }],
    ["dmResponsable chaîne vide", { dmResponsable: "" }],
    ["regionCode minuscules", { regionCode: "nord_afrique" }],
    ["regionCode commence par chiffre", { regionCode: "1NORD" }],
    ["regionCode avec espaces", { regionCode: "NORD AFRIQUE" }],
    ["regionCode > 50 chars", { regionCode: "A".repeat(51) }],
    ["nom > 100 chars", { nom: "x".repeat(101) }],
    ["dmResponsable > 100 chars", { dmResponsable: "y".repeat(101) }],
  ])("rejette quand %s", (_label, override) => {
    const thrown = captureThrown(() => Region.create({ ...VALID_INPUT, ...override }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-702" });
  });
});

describe("Region.rehydrate — pas de validation (BD = source)", () => {
  it("reconstruit une PersistedRegion sans valider", () => {
    const date = new Date("2026-05-01T10:00:00Z");
    const r = Region.rehydrate({
      id: 42,
      regionCode: "NORD_AFRIQUE",
      nom: "Afrique du Nord",
      dmResponsable: "Alice DUPONT",
      actif: true,
      dateCreation: date,
    });
    expect(r).toBeInstanceOf(PersistedRegion);
    expect(r.id).toBe(42);
    expect(r.dateCreation).toBe(date);
  });

  it("accepte un état BD techniquement invalide (test de robustesse)", () => {
    // La BD est source de vérité — si elle a un état invalide pour une raison
    // historique, l'app doit pouvoir le lire (et c'est l'écran qui gérera).
    const r = Region.rehydrate({
      id: 1,
      regionCode: "anciennes_regles",
      nom: "Ancien libellé",
      actif: true,
      dateCreation: new Date(),
    });
    expect(r.regionCode).toBe("anciennes_regles");
  });
});

describe("PersistedRegion — mutations immuables", () => {
  const persisted = Region.rehydrate({
    id: 1,
    regionCode: "NORD_AFRIQUE",
    nom: "Afrique du Nord",
    dmResponsable: "Alice DUPONT",
    actif: true,
    dateCreation: new Date("2026-05-01T10:00:00Z"),
  });

  it("withName retourne une nouvelle instance avec le nouveau nom", () => {
    const renamed = persisted.withName("Maghreb");
    expect(renamed).not.toBe(persisted);
    expect(renamed.nom).toBe("Maghreb");
    // Les autres champs sont conservés
    expect(renamed.id).toBe(persisted.id);
    expect(renamed.regionCode).toBe(persisted.regionCode);
    expect(renamed.dmResponsable).toBe(persisted.dmResponsable);
    expect(renamed.actif).toBe(persisted.actif);
    // L'original est inchangé
    expect(persisted.nom).toBe("Afrique du Nord");
  });

  it("withName valide le nouveau nom (throw SPX-LIC-702 si invalide)", () => {
    const thrown = captureThrown(() => persisted.withName(""));
    expect(thrown).toMatchObject({ code: "SPX-LIC-702" });
  });

  it("withDmResponsable(string) remplace la valeur", () => {
    const updated = persisted.withDmResponsable("Bob MARTIN");
    expect(updated.dmResponsable).toBe("Bob MARTIN");
  });

  it("withDmResponsable(null) efface la valeur", () => {
    const updated = persisted.withDmResponsable(null);
    expect(updated.dmResponsable).toBeUndefined();
  });

  it("withDmResponsable(undefined) efface la valeur", () => {
    const updated = persisted.withDmResponsable(undefined);
    expect(updated.dmResponsable).toBeUndefined();
  });

  it("withDmResponsable rejette une chaîne vide", () => {
    const thrown = captureThrown(() => persisted.withDmResponsable(""));
    expect(thrown).toMatchObject({ code: "SPX-LIC-702" });
  });

  it("toggle bascule actif → false", () => {
    const off = persisted.toggle();
    expect(off.actif).toBe(false);
    expect(persisted.actif).toBe(true);
  });

  it("toggle bascule false → actif", () => {
    const off = persisted.toggle();
    const on = off.toggle();
    expect(on.actif).toBe(true);
  });
});

describe("toAuditSnapshot — sérialisation pour audit", () => {
  it("Region inclut les 4 champs business", () => {
    const r = Region.create({ ...VALID_INPUT, dmResponsable: "Alice" });
    expect(r.toAuditSnapshot()).toEqual({
      regionCode: "NORD_AFRIQUE",
      nom: "Afrique du Nord",
      dmResponsable: "Alice",
      actif: true,
    });
  });

  it("Region remplace dmResponsable=undefined par null (JSON-friendly)", () => {
    const r = Region.create(VALID_INPUT);
    expect(r.toAuditSnapshot()).toMatchObject({ dmResponsable: null });
  });

  it("PersistedRegion ajoute id en surcharge", () => {
    const r = Region.rehydrate({
      id: 7,
      regionCode: "NORD_AFRIQUE",
      nom: "x",
      actif: true,
      dateCreation: new Date(),
    });
    expect(r.toAuditSnapshot()).toMatchObject({ id: 7 });
  });
});
