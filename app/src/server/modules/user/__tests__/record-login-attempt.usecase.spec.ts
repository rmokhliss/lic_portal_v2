// ==============================================================================
// LIC v2 — Test d'intégration RecordLoginAttemptUseCase (Phase 15 — audit Master C1)
//
// 3 cas couverts :
//   1. Échec login → counter+1 + last_failed_login_at posé
//   2. 5 échecs consécutifs → audit LOGIN_FAILED_LOCKOUT + isLockedOut() = true
//   3. Succès login → reset counter à 0 + last_failed_login_at à NULL
// ==============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import postgres from "postgres";

import { AuditRepositoryPg } from "../../audit/adapters/postgres/audit.repository.pg";
import { UserRepositoryPg } from "../adapters/postgres/user.repository.pg";
import {
  LOGIN_LOCKOUT_THRESHOLD,
  LOGIN_LOCKOUT_WINDOW_MS,
  RecordLoginAttemptUseCase,
} from "../application/record-login-attempt.usecase";

const TARGET_ID = "01928c8e-1234-5678-9abc-def012345abc";

let sql: postgres.Sql;
let useCase: RecordLoginAttemptUseCase;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition runtime test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  useCase = new RecordLoginAttemptUseCase(new UserRepositoryPg(), new AuditRepositoryPg());
});

afterEach(async () => {
  await sql`TRUNCATE TABLE lic_audit_log, lic_users CASCADE`;
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES (${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      false, 'SADMIN', false, NOW(), NOW())
  `;
});

afterAll(async () => {
  await sql.end();
});

async function seedTarget(failedCount = 0): Promise<void> {
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      failed_login_count, must_change_password, token_version, role, actif,
      created_at, updated_at)
    VALUES (${TARGET_ID}, 'MAT-803', 'TEST', 'Brute', 'brute@s2m.local',
      '$2a$10$dummy', ${failedCount}, false, 0, 'ADMIN', true, NOW(), NOW())
  `;
}

describe("RecordLoginAttemptUseCase — Phase 15 brute-force lockout", () => {
  it("recordFailure incrémente failed_login_count + pose last_failed_login_at", async () => {
    await seedTarget(0);

    await useCase.recordFailure(TARGET_ID, "Brute TEST (MAT-803)", 0);

    const rows = await sql<{ failed_login_count: number; last_failed_login_at: Date | null }[]>`
      SELECT failed_login_count, last_failed_login_at FROM lic_users WHERE id = ${TARGET_ID}
    `;
    expect(rows[0]?.failed_login_count).toBe(1);
    expect(rows[0]?.last_failed_login_at).toBeInstanceOf(Date);
  });

  it("au passage 4 → 5 émet l'audit LOGIN_FAILED_LOCKOUT et isLockedOut() = true", async () => {
    await seedTarget(4);

    await useCase.recordFailure(TARGET_ID, "Brute TEST (MAT-803)", 4);

    const rows = await sql<{ failed_login_count: number; last_failed_login_at: Date | null }[]>`
      SELECT failed_login_count, last_failed_login_at FROM lic_users WHERE id = ${TARGET_ID}
    `;
    expect(rows[0]?.failed_login_count).toBe(LOGIN_LOCKOUT_THRESHOLD);

    const audit = await sql<{ action: string }[]>`
      SELECT action FROM lic_audit_log WHERE entity_id = ${TARGET_ID}
    `;
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("LOGIN_FAILED_LOCKOUT");

    // isLockedOut sans paramètre now = maintenant → fenêtre 60 min active.
    const last = rows[0]?.last_failed_login_at ?? null;
    expect(useCase.isLockedOut(LOGIN_LOCKOUT_THRESHOLD, last)).toBe(true);

    // Au-delà de la fenêtre 60 min → plus locked.
    const future = last === null ? null : new Date(last.getTime() + LOGIN_LOCKOUT_WINDOW_MS + 1000);
    expect(useCase.isLockedOut(LOGIN_LOCKOUT_THRESHOLD, last, future ?? new Date())).toBe(false);
  });

  it("recordSuccess reset failed_login_count à 0 + last_failed_login_at à NULL", async () => {
    await seedTarget(LOGIN_LOCKOUT_THRESHOLD);
    await sql`
      UPDATE lic_users SET last_failed_login_at = NOW() WHERE id = ${TARGET_ID}
    `;

    await useCase.recordSuccess(TARGET_ID);

    const rows = await sql<{ failed_login_count: number; last_failed_login_at: Date | null }[]>`
      SELECT failed_login_count, last_failed_login_at FROM lic_users WHERE id = ${TARGET_ID}
    `;
    expect(rows[0]?.failed_login_count).toBe(0);
    expect(rows[0]?.last_failed_login_at).toBeNull();
  });
});
