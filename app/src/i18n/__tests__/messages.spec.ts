// ==============================================================================
// LIC v2 — Test snapshot parité fr.json ⇔ en.json (F-11, Référentiel §4.17)
//
// Vérifie qu'aucune clé n'est orpheline entre les deux locales (clé dans FR
// absente de EN ou vice-versa). Détecte aussi les valeurs vides accidentelles.
// ==============================================================================

import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import fr from "../messages/fr.json";

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix === "" ? k : `${prefix}.${k}`;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

function getValue(obj: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, k) => {
    if (typeof acc !== "object" || acc === null) return undefined;
    return (acc as Record<string, unknown>)[k];
  }, obj);
}

describe("i18n messages parity", () => {
  it("fr.json et en.json ont exactement les mêmes clés (structure profonde)", () => {
    const frKeys = flattenKeys(fr);
    const enKeys = flattenKeys(en);
    expect(frKeys).toEqual(enKeys);
  });

  it("aucune valeur vide en FR (source de vérité)", () => {
    const frFlat = flattenKeys(fr);
    for (const key of frFlat) {
      const value = getValue(fr, key);
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  it("aucune valeur vide en EN", () => {
    const enFlat = flattenKeys(en);
    for (const key of enFlat) {
      const value = getValue(en, key);
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
