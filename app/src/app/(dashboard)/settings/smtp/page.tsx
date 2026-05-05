// LIC v2 — /settings/smtp (T-04 — libellé "Non implémenté (SMTP)")

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function SettingsSmtpPage() {
  const t = await getTranslations("settings.stub.smtp");
  // T-04 : phase=null → bandeau "Non implémenté (SMTP)" au lieu de "Disponible Phase 8".
  return <PhaseStub phase={null} label={t("label")} description={t("description")} />;
}
