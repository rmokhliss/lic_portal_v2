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
}

export function ClientDetailTabsNav({ clientId }: ClientDetailTabsNavProps) {
  const pathname = usePathname();
  const t = useTranslations("clients.detail.tabs");

  const active: TabKey =
    TABS.find((tab) => pathname.startsWith(`/clients/${clientId}/${tab}`)) ?? "info";

  return (
    <Tabs value={active} className="w-full">
      <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto">
        {TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab} asChild>
            <Link href={`/clients/${clientId}/${tab}`}>{t(tab)}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
