// Tests du helper cursor (F-08). Pas de connexion BD : helper pur.

import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "../cursor";

const SAMPLE_DATE = new Date("2026-05-02T10:30:00.000Z");
const SAMPLE_UUID = "01928c8e-aaaa-bbbb-cccc-ddddeeee0001";

describe("encodeCursor", () => {
  it("retourne un string base64url valide (alphabet A-Z, a-z, 0-9, _, -)", () => {
    const cursor = encodeCursor(SAMPLE_DATE, SAMPLE_UUID);
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("est déterministe (même input → même cursor)", () => {
    const c1 = encodeCursor(SAMPLE_DATE, SAMPLE_UUID);
    const c2 = encodeCursor(SAMPLE_DATE, SAMPLE_UUID);
    expect(c1).toBe(c2);
  });

  it("ne contient ni '+' ni '/' ni '=' (caractères base64 standard exclus de base64url)", () => {
    const cursor = encodeCursor(SAMPLE_DATE, SAMPLE_UUID);
    expect(cursor).not.toMatch(/[+/=]/);
  });
});

describe("decodeCursor — round-trip", () => {
  it("decode(encode(d, id)) retourne {timestamp, id} égaux à l'entrée", () => {
    const cursor = encodeCursor(SAMPLE_DATE, SAMPLE_UUID);
    const decoded = decodeCursor(cursor);
    expect(decoded.timestamp.getTime()).toBe(SAMPLE_DATE.getTime());
    expect(decoded.id).toBe(SAMPLE_UUID);
  });

  it("supporte un UUID en majuscules (hex insensitive)", () => {
    const upperUuid = "01928C8E-AAAA-BBBB-CCCC-DDDDEEEE0001";
    const cursor = encodeCursor(SAMPLE_DATE, upperUuid);
    const decoded = decodeCursor(cursor);
    expect(decoded.id).toBe(upperUuid);
  });
});

describe("decodeCursor — throws SPX-LIC-502 sur cursor invalide", () => {
  it.each<readonly [string, string]>([
    ["string vide", ""],
    ["caractère hors alphabet : '/'", "abc/def"],
    ["caractère hors alphabet : '+'", "abc+def"],
    ["caractère hors alphabet : '='", "abc=="],
    ["caractère hors alphabet : '!'", "abc!def"],
  ])("rejette %s", (_label, cursor) => {
    let thrown: unknown;
    try {
      decodeCursor(cursor);
    } catch (e: unknown) {
      thrown = e;
    }
    expect(thrown).toMatchObject({ code: "SPX-LIC-502" });
  });

  it("rejette un base64url valide sans séparateur '|'", () => {
    const cursor = Buffer.from("noseparator", "utf8").toString("base64url");
    let thrown: unknown;
    try {
      decodeCursor(cursor);
    } catch (e: unknown) {
      thrown = e;
    }
    expect(thrown).toMatchObject({ code: "SPX-LIC-502" });
  });

  it("rejette un payload avec ISO 8601 invalide", () => {
    const cursor = Buffer.from(`not-a-date|${SAMPLE_UUID}`, "utf8").toString("base64url");
    let thrown: unknown;
    try {
      decodeCursor(cursor);
    } catch (e: unknown) {
      thrown = e;
    }
    expect(thrown).toMatchObject({ code: "SPX-LIC-502" });
  });

  it("rejette un payload avec UUID invalide", () => {
    const cursor = Buffer.from(`${SAMPLE_DATE.toISOString()}|not-a-uuid`, "utf8").toString(
      "base64url",
    );
    let thrown: unknown;
    try {
      decodeCursor(cursor);
    } catch (e: unknown) {
      thrown = e;
    }
    expect(thrown).toMatchObject({ code: "SPX-LIC-502" });
  });
});
