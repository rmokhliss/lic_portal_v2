// ==============================================================================
// LIC v2 — SettingsTabsNav (Phase 2.B étape 6/7)
//
// Client Component de navigation entre les 9 onglets EC-13 (PROJECT_CONTEXT_LIC
// §8.3 ligne 343). Chaque onglet est une route Next.js dédiée
// (/settings/<tab>/page.tsx) — la valeur active est dérivée de usePathname()
// et chaque TabsTrigger render asChild un <Link> next/link pour préserver
// le SSR + l'URL persistante au rafraîchissement.
//
// L'ordre des onglets est figé par PROJECT_CONTEXT — ne pas réordonner.
// ==============================================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SETTINGS_TABS = [
  "general",
  "security",
  "smtp",
  "catalogues",
  "team",
  "users",
  "sandbox",
  "demo",
  "info",
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

export function SettingsTabsNav() {
  const pathname = usePathname();
  const t = useTranslations("settings.tabs");

  // Détermine l'onglet actif à partir du segment courant. Fallback "general"
  // si aucun match (cas /settings nu — la page racine redirige déjà vers
  // /settings/general, donc on n'arrive normalement jamais ici).
  const active: SettingsTab =
    SETTINGS_TABS.find((tab) => pathname.startsWith(`/settings/${tab}`)) ?? "general";

  return (
    <Tabs value={active} className="w-full">
      <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto">
        {SETTINGS_TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab} asChild>
            <Link href={`/settings/${tab}`}>{t(tab)}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
