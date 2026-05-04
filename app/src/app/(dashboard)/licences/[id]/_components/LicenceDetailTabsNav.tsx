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
}

export function LicenceDetailTabsNav({ licenceId }: LicenceDetailTabsNavProps) {
  const pathname = usePathname();
  const t = useTranslations("licences.detail.tabs");

  const active: TabKey =
    TABS.find((tab) => pathname.startsWith(`/licences/${licenceId}/${tab}`)) ?? "resume";

  return (
    <Tabs value={active} className="w-full">
      <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto">
        {TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab} asChild>
            <Link href={`/licences/${licenceId}/${tab}`}>{t(tab)}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
