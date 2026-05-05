// ==============================================================================
// LIC v2 — Tests allocateNextReference (Phase 16 — DETTE-LIC-011 résolue)
//
// Vérifie l'atomicité de la séquence PG `lic_licence_reference_seq` (migration
// 0013) face à 10 appels concurrents : aucune référence dupliquée attendue.
//
// La race condition pré-Phase-16 (SELECT MAX + INSERT non atomique) est
// éliminée par `nextval()`. Avec connexion postgres-js max:1, tester la
// concurrence stricte demanderait 2 connexions distinctes ; à la place on
// vérifie l'unicité + monotonie sur 10 appels séquentiels (suffisant car
// nextval() est atomique côté serveur PG indépendamment du nombre de connexions).
// ==============================================================================

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import postgres from "postgres";

import { LicenceRepositoryPg } from "../adapters/postgres/licence.repository.pg";

let sql: postgres.Sql;
let repo: LicenceRepositoryPg;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition runtime test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  repo = new LicenceRepositoryPg();
});

afterAll(async () => {
  await sql.end();
});

describe("allocateNextReference — séquence PG (Phase 16, DETTE-LIC-011)", () => {
  it("retourne une référence au format LIC-{YYYY}-{NNN} avec padding 3", async () => {
    const ref = await repo.allocateNextReference();
    expect(ref).toMatch(/^LIC-\d{4}-\d{3,}$/);
    const year = new Date().getFullYear();
    expect(ref.startsWith(`LIC-${String(year)}-`)).toBe(true);
  });

  it("10 appels séquentiels → 10 références distinctes et monotones", async () => {
    const refs: string[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(await repo.allocateNextReference());
    }
    // Toutes uniques
    const unique = new Set(refs);
    expect(unique.size).toBe(10);

    // Monotones (suffixe NNN strictement croissant)
    const suffixes = refs.map((r) => {
      const match = /^LIC-\d{4}-(\d+)$/.exec(r);
      if (match?.[1] === undefined) {
        // eslint-disable-next-line no-restricted-syntax -- assertion runtime test
        throw new Error(`reference malformée: ${r}`);
      }
      return parseInt(match[1], 10);
    });
    for (let i = 1; i < suffixes.length; i++) {
      expect(suffixes[i]).toBeGreaterThan(suffixes[i - 1] ?? 0);
    }
  });

  it("appels concurrents (Promise.all 10) → 10 références distinctes (atomicité nextval)", async () => {
    const refs = await Promise.all(Array.from({ length: 10 }, () => repo.allocateNextReference()));
    const unique = new Set(refs);
    expect(unique.size).toBe(10);
  });
});
