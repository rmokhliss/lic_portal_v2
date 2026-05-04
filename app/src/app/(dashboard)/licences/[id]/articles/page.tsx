// LIC v2 — /licences/[id]/articles (Phase 5.F, stub Phase 6)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function LicenceArticlesPage() {
  const t = await getTranslations("licences.detail.tabs");
  return (
    <PhaseStub
      phase="6"
      label={t("articles")}
      description="Articles SELECT-PX inclus dans cette licence (volumes mensuels, alertes seuils)."
    />
  );
}
