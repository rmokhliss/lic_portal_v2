// ==============================================================================
// LIC v2 — Schémas Zod settings (Phase 2.B étape 7/7)
//
// Validation du form /settings/general — 9 clés data-model.md §lic_settings.
// Toutes les clés sont optionnelles dans le payload : on autorise un patch
// partiel (l'UI peut soumettre uniquement les champs modifiés).
// ==============================================================================

import { z } from "zod";

export const SettingsGeneralSchema = z
  .object({
    seuil_alerte_defaut: z.number().int().min(0).max(100).optional(),
    tolerance_volume_pct: z.number().int().min(0).max(100).optional(),
    tolerance_date_jours: z.number().int().min(0).max(365).optional(),
    warning_volume_pct: z.number().int().min(0).max(100).optional(),
    warning_date_jours: z.number().int().min(0).max(365).optional(),
    licence_file_aes_key: z.string().max(512).optional(),
    healthcheck_aes_key: z.string().max(512).optional(),
    smtp_configured: z.boolean().optional(),
    app_name: z.string().min(1).max(100).optional(),
  })
  .strict();

export type SettingsGeneralInput = z.infer<typeof SettingsGeneralSchema>;

export const SETTINGS_GENERAL_KEYS = [
  "seuil_alerte_defaut",
  "tolerance_volume_pct",
  "tolerance_date_jours",
  "warning_volume_pct",
  "warning_date_jours",
  "licence_file_aes_key",
  "healthcheck_aes_key",
  "smtp_configured",
  "app_name",
] as const;

export type SettingsGeneralKey = (typeof SETTINGS_GENERAL_KEYS)[number];
