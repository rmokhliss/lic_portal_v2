// LIC v2 — /settings/security (Phase 2.B étape 6/7, stub Phase 3 PKI)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function SettingsSecurityPage() {
  const t = await getTranslations("settings.stub.security");
  return <PhaseStub phase="3" label={t("label")} description={t("description")} />;
}
