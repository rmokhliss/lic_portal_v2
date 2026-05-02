// ==============================================================================
// LIC v2 — Test d'intégration AuditRecorderPg (F-07)
//
// Vérifie l'INSERT direct + le calcul automatique de search_vector côté BD
// (GENERATED ALWAYS STORED, F-06).
// ==============================================================================

import "../../../../../scripts/load-env";

import postgres from "postgres";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

// L'adapter importe transitively client.ts qui charge `server-only`.
vi.mock("server-only", () => ({}));

import { AuditRecorderPg } from "../adapters/postgres/audit.recorder.pg";

let sql: postgres.Sql;
let recorder: AuditRecorderPg;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- test fixture, pré-condition de runtime
    throw new Error("DATABASE_URL absent — vérifier .env à la racine du repo");
  }
  sql = postgres(url, { max: 1 });
  recorder = new AuditRecorderPg();
});

afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log CASCADE`;
});

afterAll(async () => {
  await sql.end();
});

describe("AuditRecorderPg.record", () => {
  it("INSERT une ligne complète et search_vector est populé automatiquement", async () => {
    await recorder.record({
      entity: "user",
      entityId: "01928c8e-aaaa-bbbb-cccc-ddddeeee0001",
      action: "PASSWORD_CHANGED",
      beforeData: { mustChangePassword: true },
      afterData: { mustChangePassword: false, tokenVersionBumped: true },
      userId: SYSTEM_USER_ID,
      userDisplay: "Système (SYS-000)",
      ipAddress: "127.0.0.1",
      mode: "MANUEL",
      metadata: { context: "test integration" },
    });

    const rows = await sql<
      {
        entity: string;
        action: string;
        user_display: string;
        mode: string;
        search_vector: string | null;
      }[]
    >`
      SELECT entity, action, user_display, mode, search_vector::text as search_vector
      FROM lic_audit_log
      WHERE entity_id = '01928c8e-aaaa-bbbb-cccc-ddddeeee0001'
    `;

    expect(rows).toHaveLength(1);
    expect(rows[0]?.entity).toBe("user");
    expect(rows[0]?.action).toBe("PASSWORD_CHANGED");
    expect(rows[0]?.user_display).toBe("Système (SYS-000)");
    expect(rows[0]?.mode).toBe("MANUEL");
    // search_vector populé par GENERATED. Le tsvector français normalise les
    // tokens (ex: "PASSWORD_CHANGED" → 'password' + 'changed'). On vérifie la
    // présence de tokens distincts plutôt qu'une chaîne brute.
    expect(rows[0]?.search_vector).toBeTruthy();
    expect(rows[0]?.search_vector).toMatch(/'user'/);
    expect(rows[0]?.search_vector).toMatch(/'password'/);
    expect(rows[0]?.search_vector).toMatch(/'changed'/);
  });

  it("accepte les champs optionnels manquants (clientId, clientDisplay, metadata)", async () => {
    await recorder.record({
      entity: "user",
      entityId: "01928c8e-bbbb-cccc-dddd-eeeeffff0002",
      action: "LOGIN",
      userId: SYSTEM_USER_ID,
      mode: "MANUEL",
    });

    const rows = await sql<{ client_id: string | null; metadata: unknown }[]>`
      SELECT client_id, metadata FROM lic_audit_log
      WHERE entity_id = '01928c8e-bbbb-cccc-dddd-eeeeffff0002'
    `;

    expect(rows).toHaveLength(1);
    expect(rows[0]?.client_id).toBeNull();
    expect(rows[0]?.metadata).toBeNull();
  });
});
