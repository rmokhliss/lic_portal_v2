// ==============================================================================
// LIC v2 — Port SettingRepository (Phase 2.B étape 7/7)
//
// Surface 2 méthodes (alignées Référentiel §4.12.2 abstract class) :
//   - findAll()              : retourne toutes les paires (k,v) — volume <50
//   - upsertMany(entries, by) : INSERT ... ON CONFLICT DO UPDATE par batch
//
// Pas de tx optionnel : pas d'audit cross-module (R-27 — table technique).
// upsertMany est atomique côté Postgres (un seul statement avec VALUES batch).
// ==============================================================================

import type { Setting } from "../domain/setting.entity";

export interface SettingUpsertEntry {
  readonly key: string;
  readonly value: unknown;
}

export abstract class SettingRepository {
  abstract findAll(): Promise<readonly Setting[]>;

  abstract upsertMany(entries: readonly SettingUpsertEntry[], updatedBy: string): Promise<void>;
}
