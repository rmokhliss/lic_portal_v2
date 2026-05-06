// ==============================================================================
// LIC v2 — /settings/general (Phase 2.B étape 7/7 + Phase 18 R-18)
//
// Lit les seuils + tolérances métier via ListSettingsUseCase puis les passe au
// form client. Phase 18 R-18 — clés AES + smtp_configured + app_name retirés
// du form (cf. SettingsGeneralForm).
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
      }}
    />
  );
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
