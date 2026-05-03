// ==============================================================================
// LIC v2 — /settings/general (Phase 2.B étape 7/7)
//
// Lit les 9 clés lic_settings via ListSettingsUseCase puis les passe au form
// client. La Server Action updateGeneralSettingsAction (importée depuis
// _actions.ts) est passée en prop pour que le form la déclenche après
// soumission.
// ==============================================================================

import { listSettingsUseCase } from "@/server/composition-root";

import { SettingsGeneralForm } from "../_components/SettingsGeneralForm";
import { updateGeneralSettingsAction } from "../_actions";

export default async function SettingsGeneralPage() {
  const map = await listSettingsUseCase.execute();

  return (
    <SettingsGeneralForm
      action={updateGeneralSettingsAction}
      initial={{
        seuil_alerte_defaut: numOrUndef(map.seuil_alerte_defaut),
        tolerance_volume_pct: numOrUndef(map.tolerance_volume_pct),
        tolerance_date_jours: numOrUndef(map.tolerance_date_jours),
        warning_volume_pct: numOrUndef(map.warning_volume_pct),
        warning_date_jours: numOrUndef(map.warning_date_jours),
        licence_file_aes_key: strOrUndef(map.licence_file_aes_key),
        healthcheck_aes_key: strOrUndef(map.healthcheck_aes_key),
        smtp_configured: typeof map.smtp_configured === "boolean" ? map.smtp_configured : false,
        app_name: strOrUndef(map.app_name),
      }}
    />
  );
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function strOrUndef(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
