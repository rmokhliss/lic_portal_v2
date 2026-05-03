// LIC v2 — /settings/smtp (Phase 2.B étape 6/7, stub Phase 8 notifications)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function SettingsSmtpPage() {
  const t = await getTranslations("settings.stub.smtp");
  return <PhaseStub phase="8" label={t("label")} description={t("description")} />;
}
