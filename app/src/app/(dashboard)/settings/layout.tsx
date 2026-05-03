// ==============================================================================
// LIC v2 — /settings layout (Phase 2.B étape 6/7, EC-13)
//
// Garde SADMIN unique pour TOUTES les sous-routes /settings/* (règle L11 +
// PROJECT_CONTEXT_LIC §8.3 ligne 343). requireRolePage redirige vers / si le
// rôle est insuffisant (cf. auth/index.ts:requireRolePage — comportement
// gracieux règle L14, pas de page 403 dédiée).
//
// Le layout fournit :
//   - Le titre EC-13 + sous-titre
//   - La barre de tabs (SettingsTabsNav, Client Component)
//   - Le {children} qui rend la page de l'onglet actif
//
// La page racine /settings/page.tsx redirige vers /settings/general pour
// éviter un état "aucun onglet sélectionné".
// ==============================================================================

import type { ReactNode } from "react";

import { getTranslations } from "next-intl/server";

import { SettingsTabsNav } from "@/components/shared/SettingsTabsNav";
import { requireRolePage } from "@/server/infrastructure/auth";

export default async function SettingsLayout({ children }: { readonly children: ReactNode }) {
  await requireRolePage(["SADMIN"]);
  const t = await getTranslations("settings");

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display text-foreground text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>
      <SettingsTabsNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
