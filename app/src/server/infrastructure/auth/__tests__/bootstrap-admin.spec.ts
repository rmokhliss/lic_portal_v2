// ==============================================================================
// LIC v2 — Tests d'intégration bootstrap admin (F-07)
//
// Tests réels BD (postgres docker requis). 3 cas :
//   1. SADMIN actif existe → skip (aucun INSERT)
//   2. Aucun SADMIN actif + 3 vars présentes → INSERT user SADMIN
//   3. Aucun SADMIN actif + vars absentes → skip
//
// Cleanup TRUNCATE + re-seed SYSTEM en afterAll (cohérent migration.spec.ts F-06).
// ==============================================================================

import "../../../../../scripts/load-env";

import bcryptjs from "bcryptjs";
import postgres from "postgres";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

// Le module bootstrap-admin importe transitively client.ts qui charge `server-only`
// (module spécial Next.js, non résolvable en test).
vi.mock("server-only", () => ({}));

let sql: postgres.Sql;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- test fixture, pré-condition de runtime
    throw new Error("DATABASE_URL absent — vérifier .env à la racine du repo");
  }
  sql = postgres(url, { max: 1 });
});

afterEach(async () => {
  // Reset table users entre chaque test (mais garde SYSTEM via re-INSERT)
  await sql`TRUNCATE TABLE lic_audit_log, lic_users CASCADE`;
  await sql`
    INSERT INTO lic_users (
      id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at
    ) VALUES (
      ${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', false, NOW(), NOW()
    )
  `;
});

afterAll(async () => {
  await sql.end();
});

async function importBootstrap() {
  // Reset cache modules : le module env est évalué UNE FOIS au premier import
  // et fige process.env. Sans resetModules, les mutations process.env entre
  // tests ne se propagent pas dans bootstrapAdmin.
  vi.resetModules();
  const mod = await import("../bootstrap-admin");
  return mod.bootstrapAdmin;
}

describe("bootstrapAdmin — cas 1 : SADMIN actif existe → skip", () => {
  it("ne crée aucun user supplémentaire", async () => {
    // Pré : seed un SADMIN actif
    await sql`
      INSERT INTO lic_users (
        matricule, nom, prenom, email, password_hash,
        must_change_password, role, actif, created_at, updated_at
      ) VALUES (
        'MAT-099', 'Existant', 'Admin', 'existant@s2m.local',
        '$2a$10$hopYgusn/V6M4Afk2JQW6uh0DYf9qUnjClRFv.iDQtTdFHTUslT1q',
        false, 'SADMIN', true, NOW(), NOW()
      )
    `;

    process.env.INITIAL_ADMIN_EMAIL = "admin@s2m.local";
    process.env.INITIAL_ADMIN_PASSWORD = "ChangeMe-F07-DevOnly-A8x2!";
    process.env.INITIAL_ADMIN_MATRICULE = "MAT-001";

    const bootstrapAdmin = await importBootstrap();
    await bootstrapAdmin();

    const all = await sql<{ matricule: string }[]>`
      SELECT matricule FROM lic_users WHERE role = 'SADMIN' AND actif = true
    `;
    // SYSTEM est actif=false, l'existant MAT-099 est seul SADMIN actif.
    expect(all).toHaveLength(1);
    expect(all[0]?.matricule).toBe("MAT-099");
  });
});

describe("bootstrapAdmin — cas 2 : aucun SADMIN actif + 3 vars → INSERT", () => {
  it("crée le user SADMIN avec must_change_password=true", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "admin@s2m.local";
    process.env.INITIAL_ADMIN_PASSWORD = "ChangeMe-F07-DevOnly-A8x2!";
    process.env.INITIAL_ADMIN_MATRICULE = "MAT-001";

    const bootstrapAdmin = await importBootstrap();
    await bootstrapAdmin();

    const rows = await sql<
      {
        matricule: string;
        role: string;
        actif: boolean;
        must_change_password: boolean;
        password_hash: string;
      }[]
    >`
      SELECT matricule, role, actif, must_change_password, password_hash
      FROM lic_users WHERE matricule = 'MAT-001'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe("SADMIN");
    expect(rows[0]?.actif).toBe(true);
    expect(rows[0]?.must_change_password).toBe(true);

    // Hash bcrypt valide qui matche le password fourni
    const hash = rows[0]?.password_hash ?? "";
    expect(await bcryptjs.compare("ChangeMe-F07-DevOnly-A8x2!", hash)).toBe(true);
  });
});

describe("bootstrapAdmin — cas 3 : aucun SADMIN + vars absentes → skip", () => {
  it("ne crée aucun user", async () => {
    delete process.env.INITIAL_ADMIN_EMAIL;
    delete process.env.INITIAL_ADMIN_PASSWORD;
    delete process.env.INITIAL_ADMIN_MATRICULE;

    const bootstrapAdmin = await importBootstrap();
    await bootstrapAdmin();

    const rows = await sql<{ count: string }[]>`
      SELECT count(*)::text as count FROM lic_users WHERE role = 'SADMIN' AND actif = true
    `;
    expect(rows[0]?.count).toBe("0");
  });
});
