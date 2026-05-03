// LIC v2 — /settings/demo (Phase 2.B étape 6/7, stub Phase 13)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function SettingsDemoPage() {
  const t = await getTranslations("settings.stub.demo");
  return <PhaseStub phase="4" label={t("label")} description={t("description")} />;
}
