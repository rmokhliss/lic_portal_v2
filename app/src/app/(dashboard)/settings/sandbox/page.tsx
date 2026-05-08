// ==============================================================================
// LIC v2 — /settings/sandbox (Phase 3.F, i18n Phase 16 — DETTE-LIC-015)
//
// Outils PKI/crypto pour test/validation. Règle L16 : aucune écriture BD.
// ==============================================================================

import { getTranslations } from "next-intl/server";

import { requireRolePage } from "@/server/infrastructure/auth";

import { SandboxPanel } from "./_components/SandboxPanel";

export default async function SettingsSandboxPage(): Promise<React.JSX.Element> {
  await requireRolePage(["SADMIN"]);
  const t = await getTranslations("settings.sandbox");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-foreground text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>

      <SandboxPanel />
    </div>
  );
}
