// ==============================================================================
// LIC v2 — ListSettingsUseCase (Phase 2.B étape 7/7)
//
// Lit toutes les clés/valeurs lic_settings et retourne un map plat
// `Record<string, unknown>` directement consommable par le form
// /settings/general. Aucune transformation autre que la dé-projection.
// ==============================================================================

import type { SettingRepository } from "../ports/setting.repository";

export class ListSettingsUseCase {
  constructor(private readonly settingRepository: SettingRepository) {}

  async execute(): Promise<Record<string, unknown>> {
    const settings = await this.settingRepository.findAll();
    const map: Record<string, unknown> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  }
}
