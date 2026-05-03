// LIC v2 — /settings/users (Phase 2.B étape 6/7, stub Phase 12 admin BO)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function SettingsUsersPage() {
  const t = await getTranslations("settings.stub.users");
  return <PhaseStub phase="2" label={t("label")} description={t("description")} />;
}
