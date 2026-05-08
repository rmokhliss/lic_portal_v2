// ==============================================================================
// LIC v2 — LicenceDetailTabsNav (Phase 5.F). Pattern R-30 (asChild + Link).
// ==============================================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslations } from "next-intl";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = ["resume", "articles", "renouvellements", "historique"] as const;
type TabKey = (typeof TABS)[number];

export interface LicenceDetailTabsNavProps {
  readonly licenceId: string;
  /** Rôle de l'utilisateur courant — l'onglet Historique est masqué pour USER
   *  (page réservée ADMIN/SADMIN, audit data). */
  readonly userRole: "USER" | "ADMIN" | "SADMIN";
}

export function LicenceDetailTabsNav({ licenceId, userRole }: LicenceDetailTabsNavProps) {
  const pathname = usePathname();
  const t = useTranslations("licences.detail.tabs");

  const visibleTabs = TABS.filter((tab) => tab !== "historique" || userRole !== "USER");

  const active: TabKey =
    visibleTabs.find((tab) => pathname.startsWith(`/licences/${licenceId}/${tab}`)) ?? "resume";

  return (
    <Tabs value={active} className="w-full">
      <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto">
        {visibleTabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} asChild>
            <Link href={`/licences/${licenceId}/${tab}`}>{t(tab)}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
