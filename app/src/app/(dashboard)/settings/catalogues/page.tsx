// LIC v2 — /settings/catalogues (Phase 2.B étape 6/7, stub Phase 6 articles)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function SettingsCataloguesPage() {
  const t = await getTranslations("settings.stub.catalogues");
  return <PhaseStub phase="6" label={t("label")} description={t("description")} />;
}
