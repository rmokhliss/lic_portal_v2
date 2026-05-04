// ==============================================================================
// LIC v2 — Test d'intégration migration F-06
//
// Premier test qui touche une vraie BD. Pattern à FIGER pour les futurs tests
// d'intégration F-07+ :
//   - charge .env via le loader CLI (zero-dep Node)
//   - connexion postgres-js dédiée (max=1, fermée en afterAll)
//   - cleanup en fin via TRUNCATE CASCADE + re-seed SYSTEM (pas DROP)
//   - timeout étendu pour les ronds-trips BD réelle
//
// PRÉ-REQUIS : Postgres Docker up (docker compose up -d postgres) et
// migration F-06 appliquée (pnpm db:migrate). Si la BD est down, le test
// échoue explicitement à la connexion.
// ==============================================================================

// Side-effect import en PREMIER (loader .env zero-dep, cf. drizzle.config.ts).
import "../../../../../scripts/load-env";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { env } from "@/server/infrastructure/env";
import { SYSTEM_USER_ID } from "@/shared/constants/system-user";

let sql: postgres.Sql;

beforeAll(() => {
  // env est validé par Zod : si DATABASE_URL manque, le module env crashe
  // process.exit(1) avant qu'on n'arrive ici (cf. infrastructure/env/index.ts).
  sql = postgres(env.DATABASE_URL, { max: 1 });
});

afterAll(async () => {
  // Cleanup : TRUNCATE CASCADE (pas DROP) pour préserver la structure BD pour
  // les autres tests d'intégration (F-07+). Re-seed SYSTEM en hardcodé pour
  // garantir l'invariant "lic_users contient toujours la ligne SYSTEM".
  await sql`TRUNCATE TABLE lic_audit_log, lic_settings, lic_users CASCADE`;
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
  await sql.end();
});

describe("migration F-06 — schéma BD attendu", () => {
  it("les 3 tables existent dans schema public", async () => {
    const rows = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'lic_%'
      ORDER BY table_name
    `;
    const names = rows.map((r) => r.table_name);
    expect(names).toContain("lic_users");
    expect(names).toContain("lic_audit_log");
    expect(names).toContain("lic_settings");
  });

  it("les 2 enums existent avec les bonnes valeurs", async () => {
    const rows = await sql<{ typname: string; values: string[] }[]>`
      SELECT typname, array_agg(enumlabel ORDER BY enumsortorder) as values
      FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE typname IN ('user_role', 'audit_mode')
      GROUP BY typname
      ORDER BY typname
    `;
    const byName = Object.fromEntries(rows.map((r) => [r.typname, r.values]));
    // Phase 4.D — 'SEED' ajouté via migration 0005 (ALTER TYPE ... ADD VALUE)
    // pour distinguer les insertions seed (pnpm db:seed) des actions réelles.
    // Phase 3.E.0 — 'SCRIPT' ajouté via migration 0011 pour les scripts pnpm
    // one-shot (backfill, opérations admin imperatives).
    expect(byName.audit_mode).toEqual(["MANUEL", "API", "JOB", "SEED", "SCRIPT"]);
    expect(byName.user_role).toEqual(["SADMIN", "ADMIN", "USER"]);
  });

  it("lic_audit_log.search_vector est GENERATED ALWAYS STORED", async () => {
    const rows = await sql<{ attname: string; attgenerated: string }[]>`
      SELECT attname, attgenerated
      FROM pg_attribute
      WHERE attrelid = 'lic_audit_log'::regclass
        AND attname = 'search_vector'
    `;
    expect(rows).toHaveLength(1);
    // 's' = STORED (PG codes attgenerated : 's' STORED, 'v' VIRTUAL, '' rien)
    expect(rows[0]?.attgenerated).toBe("s");
  });

  it("l'index GIN idx_audit_search existe sur search_vector", async () => {
    const rows = await sql<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'lic_audit_log' AND indexname = 'idx_audit_search'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.indexdef).toMatch(/USING gin/i);
    expect(rows[0]?.indexdef).toMatch(/search_vector/);
  });

  it("le compte SYSTEM (nil UUID) est seedé avec actif=false", async () => {
    const rows = await sql<
      {
        id: string;
        matricule: string;
        role: string;
        actif: boolean;
      }[]
    >`
      SELECT id, matricule, role, actif
      FROM lic_users
      WHERE id = ${SYSTEM_USER_ID}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.matricule).toBe("SYS-000");
    expect(rows[0]?.role).toBe("SADMIN");
    expect(rows[0]?.actif).toBe(false);
  });
});

describe("migration F-06 — filet de sécurité runtime", () => {
  it("INSERT explicite sur search_vector doit échouer (GENERATED ALWAYS)", async () => {
    // Tentative d'écriture directe de search_vector. PG répond :
    // "cannot insert a non-DEFAULT value into column \"search_vector\""
    // → confirme que la contrainte GENERATED ALWAYS est en place côté BD.
    await expect(
      sql`
        INSERT INTO lic_audit_log (
          entity, entity_id, action, user_id, search_vector
        ) VALUES (
          'test', gen_random_uuid(), 'CREATE',
          ${SYSTEM_USER_ID}, 'fake'::tsvector
        )
      `,
    ).rejects.toThrow(/non-DEFAULT value into column "search_vector"/);
  });
});
