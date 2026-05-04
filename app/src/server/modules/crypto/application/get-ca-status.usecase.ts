// ==============================================================================
// LIC v2 — GetCAStatusUseCase (Phase 3.C)
//
// Lecture seule. Indique à l'UI si la CA est générée et son expiration.
// Pas d'audit (lecture).
// ==============================================================================

import type { SettingRepository } from "@/server/modules/settings/ports/setting.repository";

import { CA_SETTING_KEY, isCARecord } from "./__shared/ca-storage";

export interface CAStatusOutput {
  readonly exists: boolean;
  readonly expiresAt: Date | null;
  readonly subjectCN: string | null;
  readonly generatedAt: Date | null;
}

export class GetCAStatusUseCase {
  constructor(private readonly settingRepository: SettingRepository) {}

  async execute(): Promise<CAStatusOutput> {
    const all = await this.settingRepository.findAll();
    const setting = all.find((s) => s.key === CA_SETTING_KEY);
    if (setting === undefined || !isCARecord(setting.value)) {
      return { exists: false, expiresAt: null, subjectCN: null, generatedAt: null };
    }
    return {
      exists: true,
      expiresAt: new Date(setting.value.expiresAt),
      subjectCN: setting.value.subjectCN,
      generatedAt: new Date(setting.value.generatedAt),
    };
  }
}
