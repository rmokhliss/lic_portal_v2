// LIC v2 — /clients/[id]/historique (Phase 4 étape 4.F, stub Phase 7)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function ClientHistoriquePage() {
  const t = await getTranslations("clients.detail.tabs");
  return (
    <PhaseStub
      phase="7"
      label={t("historique")}
      description="Journal d'audit filtré sur ce client (création, modifications, changement de statut, contacts)."
    />
  );
}
