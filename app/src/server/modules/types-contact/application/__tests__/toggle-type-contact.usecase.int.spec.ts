// ==============================================================================
// LIC v2 — Test d'intégration ToggleTypeContactUseCase (Phase 2.B étape 3/7)
//
// Phase 13.C — refactor TRUNCATE+reseed (R-32) pour fixer la flakiness :
// le pattern setupTransactionalTests dépendait de la donnée bootstrap
// `lic_types_contact_ref` (codes ACHAT/FACTURATION/TECHNIQUE) survivante.
// Or d'autres fichiers de tests TRUNCATEnt lic_types_contact_ref via leurs
// propres CASCADE, laissant cette table vide. Le test ToggleTypeContact
// ne trouvait alors plus 'ACHAT' → vitest reportait "0 test" au lieu de
// faire échouer (collection vide après import qui throw).
//
// Solution : beforeEach qui (TRUNCATE + reseed types bootstrap) garantit
// l'état initial cross-files indépendamment de l'ordre d'exécution.
// ==============================================================================

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import postgres from "postgres";

import { TypeContactRepositoryPg } from "../../adapters/postgres/type-contact.repository.pg";
import { ToggleTypeContactUseCase } from "../toggle-type-contact.usecase";

let sql: postgres.Sql;
let useCase: ToggleTypeContactUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  const repo = new TypeContactRepositoryPg();
  useCase = new ToggleTypeContactUseCase(repo);
});

beforeEach(async () => {
  // Reset à l'état bootstrap migration 0003 : 3 types actifs ACHAT,
  // FACTURATION, TECHNIQUE. Indépendant de l'ordre d'exécution cross-files.
  await sql`TRUNCATE TABLE lic_types_contact_ref CASCADE`;
  await sql`
    INSERT INTO lic_types_contact_ref (code, libelle, actif) VALUES
      ('ACHAT', 'Achat', true),
      ('FACTURATION', 'Facturation', true),
      ('TECHNIQUE', 'Technique', true)
    ON CONFLICT (code) DO NOTHING
  `;
});

afterAll(async () => {
  await sql.end();
});

describe("ToggleTypeContactUseCase", () => {
  it("première bascule ACHAT : true → false", async () => {
    const dto = await useCase.execute("ACHAT");
    expect(dto.actif).toBe(false);
  });

  it("deuxième bascule : false → true", async () => {
    await useCase.execute("ACHAT");
    const dto = await useCase.execute("ACHAT");
    expect(dto.actif).toBe(true);
  });

  it("throw NotFoundError SPX-LIC-712 si inexistant", async () => {
    await expect(useCase.execute("ZZZ")).rejects.toMatchObject({ code: "SPX-LIC-712" });
  });
});
