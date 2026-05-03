// ==============================================================================
// LIC v2 — UpdateSettingsUseCase (Phase 2.B étape 7/7)
//
// Patch partiel des settings. Reçoit un map clé→valeur (uniquement les clés
// modifiées par le SADMIN). Pas d'audit cross-module (R-27 — table technique
// distincte des entités métier). La traçabilité est portée par les colonnes
// updated_at + updated_by écrites par upsertMany.
// ==============================================================================

import { Setting } from "../domain/setting.entity";
import type { SettingRepository, SettingUpsertEntry } from "../ports/setting.repository";

export interface UpdateSettingsInput {
  readonly entries: Record<string, unknown>;
  readonly updatedBy: string;
}

export class UpdateSettingsUseCase {
  constructor(private readonly settingRepository: SettingRepository) {}

  async execute(input: UpdateSettingsInput): Promise<void> {
    const upserts: SettingUpsertEntry[] = [];
    for (const [key, value] of Object.entries(input.entries)) {
      Setting.validateKey(key);
      upserts.push({ key, value });
    }
    if (upserts.length === 0) return;
    await this.settingRepository.upsertMany(upserts, input.updatedBy);
  }
}
