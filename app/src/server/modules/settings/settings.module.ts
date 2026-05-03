// ==============================================================================
// LIC v2 — Composition root du module settings (Phase 2.B étape 7/7)
//
// DI manuelle intra-module. Singletons exposés :
//   - settingRepository       : surface technique, pas de cross-module audit
//                               (R-27 — table technique exclue)
//   - listSettingsUseCase     : read-only, retourne map clé→valeur
//   - updateSettingsUseCase   : mutation, UPSERT batch
//
// Pas d'audit (R-27) : lic_settings est une table technique, pas une entité
// métier. La traçabilité est portée par les colonnes updated_at + updated_by
// alimentées par upsertMany.
// ==============================================================================

import { SettingRepositoryPg } from "./adapters/postgres/setting.repository.pg";
import { ListSettingsUseCase } from "./application/list-settings.usecase";
import { UpdateSettingsUseCase } from "./application/update-settings.usecase";
import type { SettingRepository } from "./ports/setting.repository";

export const settingRepository: SettingRepository = new SettingRepositoryPg();

export const listSettingsUseCase = new ListSettingsUseCase(settingRepository);
export const updateSettingsUseCase = new UpdateSettingsUseCase(settingRepository);
