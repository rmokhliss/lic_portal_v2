// ==============================================================================
// LIC v2 — GetCACertificateUseCase (Phase 3.C / 3.G)
//
// Retourne le PEM clair de la CA (public, pas d'authentification spéciale
// requise au niveau crypto — l'autorisation est en couche app-route).
// Throws SPX-LIC-411 si la CA n'a pas encore été générée.
// ==============================================================================

import type { SettingRepository } from "@/server/modules/settings/ports/setting.repository";

import { caAbsentOrInvalid } from "../domain/x509.errors";

import { CA_SETTING_KEY, isCARecord } from "./__shared/ca-storage";

export class GetCACertificateUseCase {
  constructor(private readonly settingRepository: SettingRepository) {}

  async execute(): Promise<string> {
    const all = await this.settingRepository.findAll();
    const setting = all.find((s) => s.key === CA_SETTING_KEY);
    if (setting === undefined || !isCARecord(setting.value)) {
      throw caAbsentOrInvalid("CA S2M non générée");
    }
    return setting.value.certificatePem;
  }
}
