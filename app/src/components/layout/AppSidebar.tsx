// ==============================================================================
// LIC v2 — AppSidebar (Server Component, F-12 + Phase 23 R-37 logo fixe)
//
// Sidebar fixe gauche. 4 groupes principaux + Paramétrage isolé en bas.
// Filtrage par rôle utilisateur (canSeeRoute). Libellés via
// getTranslations('nav') (next-intl Server Component).
//
// Phase 23 R-37 — Le mode adaptatif Phase 20 R-26 (vars DS qui flip via
// `:root.light`) rendait le logo peu lisible en mode light : `text-foreground`
// devient foncé sur fond `bg-surface-0` clair → contraste correct mais palette
// mate, illisible avec le SpxTile. Fix : on enveloppe `<BrandLockup>` dans un
// bloc `bg-slate-900` à fond foncé fixe (indépendant du thème) et on force
// `tone="dark"` pour garantir un texte blanc. Le logo reste donc toujours en
// blanc sur fond noir, quel que soit le thème global.
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
      {/* Brand en haut — Phase 23 R-37 : fond slate-900 fixe + tone="dark"
           pour garantir lisibilité quel que soit le thème global. */}
      <div className="border-border flex h-14 items-center border-b px-3">
        <div className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5">
          <BrandLockup size={28} tone="dark" />
        </div>
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
