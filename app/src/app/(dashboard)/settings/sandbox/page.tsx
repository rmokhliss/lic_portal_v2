// LIC v2 — /settings/sandbox (Phase 2.B étape 6/7, stub Phase 3 PKI / règle L16)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function SettingsSandboxPage() {
  const t = await getTranslations("settings.stub.sandbox");
  return <PhaseStub phase="3" label={t("label")} description={t("description")} />;
}
