// ==============================================================================
// LIC v2 — AppSidebar (Server Component, F-12)
//
// Sidebar fixe gauche, mode dark uniquement (LIC v2). 4 groupes principaux +
// Paramétrage isolé en bas. Filtrage par rôle utilisateur (canSeeRoute).
// Libellés via getTranslations('nav') (next-intl Server Component).
// ==============================================================================

import { getTranslations } from "next-intl/server";

import { BrandLockup } from "@/components/brand/BrandLockup";

import {
  canSeeRoute,
  NAV_GROUP_ORDER,
  NAV_ROUTES,
  type NavGroupKey,
  type NavRoute,
} from "./nav-routes";
import { SidebarLink } from "./SidebarLink";

export interface AppSidebarProps {
  readonly userRole: "SADMIN" | "ADMIN" | "USER";
}

export async function AppSidebar({ userRole }: AppSidebarProps) {
  const tGroups = await getTranslations("nav.groups");
  const tItems = await getTranslations("nav.items");

  const visibleByGroup = new Map<NavGroupKey, NavRoute[]>();
  for (const route of NAV_ROUTES) {
    if (!canSeeRoute(route, userRole)) continue;
    const list = visibleByGroup.get(route.group) ?? [];
    list.push(route);
    visibleByGroup.set(route.group, list);
  }

  const settingsRoutes = visibleByGroup.get("settings") ?? [];

  return (
    <aside className="bg-surface-0 border-border fixed inset-y-0 left-0 flex w-64 flex-col border-r">
      {/* Brand en haut */}
      <div className="border-border flex h-14 items-center border-b px-6">
        <BrandLockup size={32} tone="dark" />
      </div>

      {/* Groupes principaux */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUP_ORDER.map((groupKey) => {
          const items = visibleByGroup.get(groupKey) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={groupKey} className="mb-6">
              <h3 className="text-muted-foreground mb-2 px-3 font-mono text-[10px] font-medium uppercase tracking-wider">
                {tGroups(groupKey)}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {items.map((route) => {
                  const Icon = route.icon;
                  return (
                    <li key={route.href}>
                      <SidebarLink
                        href={route.href}
                        icon={<Icon className="size-4 shrink-0" />}
                        label={tItems(route.labelKey)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Paramétrage isolé en bas (mt-auto via flex-1 sur nav) */}
      {settingsRoutes.length > 0 && (
        <div className="border-border border-t px-3 py-4">
          <h3 className="text-muted-foreground mb-2 px-3 font-mono text-[10px] font-medium uppercase tracking-wider">
            {tGroups("settings")}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {settingsRoutes.map((route) => {
              const Icon = route.icon;
              return (
                <li key={route.href}>
                  <SidebarLink
                    href={route.href}
                    icon={<Icon className="size-4 shrink-0" />}
                    label={tItems(route.labelKey)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
