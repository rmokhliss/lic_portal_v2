// ==============================================================================
// LIC v2 — Mapper Setting (Phase 2.B étape 7/7)
//
// Conversion row Drizzle ⇄ entité Setting (rehydrate-only ; les écritures
// passent par upsertMany qui prend des paires {key,value} brutes).
// ==============================================================================

import type { settings as settingsTable } from "./schema";

import { Setting } from "../../domain/setting.entity";

type SettingRow = typeof settingsTable.$inferSelect;

export function rowToSetting(row: SettingRow): Setting {
  return Setting.rehydrate({
    key: row.key,
    value: row.value,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  });
}
