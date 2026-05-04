// LIC v2 — /licences/[id]/historique (Phase 5.F, stub Phase 7)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function LicenceHistoriquePage() {
  const t = await getTranslations("licences.detail.tabs");
  return (
    <PhaseStub
      phase="7"
      label={t("historique")}
      description="Journal d'audit filtré sur cette licence (création, modifications, statuts, renouvellements)."
    />
  );
}
