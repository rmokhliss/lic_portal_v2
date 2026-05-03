// ==============================================================================
// LIC v2 — Test d'intégration UpdateSettingsUseCase (Phase 2.B étape 7/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { SettingRepositoryPg } from "../../adapters/postgres/setting.repository.pg";
import { ListSettingsUseCase } from "../list-settings.usecase";
import { UpdateSettingsUseCase } from "../update-settings.usecase";

const ctx = createTestDb();
const repo = new SettingRepositoryPg(ctx.db);
const updateUseCase = new UpdateSettingsUseCase(repo);
const listUseCase = new ListSettingsUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("UpdateSettingsUseCase — UPSERT", () => {
  it("insère 2 nouvelles clés et les retrouve via List", async () => {
    await updateUseCase.execute({
      entries: { app_name: "Test Portal", smtp_configured: true },
      updatedBy: SYSTEM_USER_ID,
    });
    const map = await listUseCase.execute();
    expect(map.app_name).toBe("Test Portal");
    expect(map.smtp_configured).toBe(true);
  });

  it("met à jour une clé existante (idempotence : 2e exécution conserve la dernière valeur)", async () => {
    await updateUseCase.execute({
      entries: { seuil_alerte_defaut: 80 },
      updatedBy: SYSTEM_USER_ID,
    });
    await updateUseCase.execute({
      entries: { seuil_alerte_defaut: 90 },
      updatedBy: SYSTEM_USER_ID,
    });
    const map = await listUseCase.execute();
    expect(map.seuil_alerte_defaut).toBe(90);
  });

  it("payload vide est un no-op (pas d'erreur)", async () => {
    await updateUseCase.execute({ entries: {}, updatedBy: SYSTEM_USER_ID });
    const map = await listUseCase.execute();
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("rejette une clé invalide (regex)", async () => {
    await expect(
      updateUseCase.execute({
        entries: { "Invalid-Key": 1 },
        updatedBy: SYSTEM_USER_ID,
      }),
    ).rejects.toThrow(/SPX-LIC-901|key/);
  });

  it("écrit updated_by sur la ligne", async () => {
    await updateUseCase.execute({
      entries: { app_name: "X" },
      updatedBy: SYSTEM_USER_ID,
    });
    const rows = await ctx.sql<{ updated_by: string }[]>`
      SELECT updated_by FROM lic_settings WHERE key = 'app_name'
    `;
    expect(rows[0]?.updated_by).toBe(SYSTEM_USER_ID);
  });
});
