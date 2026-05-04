// ==============================================================================
// LIC v2 — Test d'intégration GetCAStatusUseCase (Phase 3.C)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import postgres from "postgres";

import { SettingRepositoryPg } from "@/server/modules/settings/adapters/postgres/setting.repository.pg";

import { CA_SETTING_KEY } from "../__shared/ca-storage";
import { GetCAStatusUseCase } from "../get-ca-status.usecase";

const url = process.env.DATABASE_URL;
if (url === undefined || url === "") {
  // eslint-disable-next-line no-restricted-syntax -- pré-condition test
  throw new Error("DATABASE_URL absent");
}
const sql = postgres(url, { max: 1 });
const repo = new SettingRepositoryPg();
const useCase = new GetCAStatusUseCase(repo);

beforeEach(async () => {
  await sql`TRUNCATE TABLE lic_settings CASCADE`;
});

afterAll(async () => {
  // F-13 : cleanup lic_settings — les tests crypto y insèrent du contenu (CA
  // record), qui survit aux tests si on n'efface pas. D'autres specs (ex:
  // settings/update-settings.spec.ts > "payload vide est un no-op") attendent
  // lic_settings vide en début de test → garantir l'invariant ici.
  await sql`TRUNCATE TABLE lic_settings CASCADE`;
  await sql.end();
});

describe("GetCAStatusUseCase", () => {
  it("retourne exists=false quand aucune CA n'est seedée", async () => {
    const status = await useCase.execute();
    expect(status.exists).toBe(false);
    expect(status.expiresAt).toBeNull();
    expect(status.subjectCN).toBeNull();
    expect(status.generatedAt).toBeNull();
  });

  it("retourne exists=true + metadata quand la CA est présente", async () => {
    const expiresAt = "2046-01-01T00:00:00.000Z";
    const generatedAt = "2026-05-04T00:00:00.000Z";
    const record = {
      certificatePem: "-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----",
      privateKeyEnc: "iv_b64:tag_b64:ct_b64",
      expiresAt,
      subjectCN: "S2M Root CA Test",
      generatedAt,
    };
    await sql`
      INSERT INTO lic_settings (key, value, updated_by)
      VALUES (${CA_SETTING_KEY}, ${sql.json(record)}, NULL)
    `;

    const status = await useCase.execute();
    expect(status.exists).toBe(true);
    expect(status.subjectCN).toBe("S2M Root CA Test");
    expect(status.expiresAt?.toISOString()).toBe(expiresAt);
    expect(status.generatedAt?.toISOString()).toBe(generatedAt);
  });
});
