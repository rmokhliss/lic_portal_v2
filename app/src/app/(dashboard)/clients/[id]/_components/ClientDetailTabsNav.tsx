// ==============================================================================
// LIC v2 — ClientDetailTabsNav (Phase 4 étape 4.F)
//
// Client Component navigation 5 tabs sub-route. Pattern R-30 (asChild + Link)
// repris de SettingsTabsNav. URLs absolues construites avec clientId.
// ==============================================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslations } from "next-intl";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = ["info", "entites", "contacts", "licences", "historique"] as const;
type TabKey = (typeof TABS)[number];

export interface ClientDetailTabsNavProps {
  readonly clientId: string;
  /** Rôle de l'utilisateur courant — l'onglet Historique est masqué pour USER
   *  (page réservée ADMIN/SADMIN, audit data). */
  readonly userRole: "USER" | "ADMIN" | "SADMIN";
}

export function ClientDetailTabsNav({ clientId, userRole }: ClientDetailTabsNavProps) {
  const pathname = usePathname();
  const t = useTranslations("clients.detail.tabs");

  const visibleTabs = TABS.filter((tab) => tab !== "historique" || userRole !== "USER");

  const active: TabKey =
    visibleTabs.find((tab) => pathname.startsWith(`/clients/${clientId}/${tab}`)) ?? "info";

  return (
    <Tabs value={active} className="w-full">
      <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto">
        {visibleTabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} asChild>
            <Link href={`/clients/${clientId}/${tab}`}>{t(tab)}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
