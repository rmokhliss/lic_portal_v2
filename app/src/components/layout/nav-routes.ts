// ==============================================================================
// LIC v2 — NAV_ROUTES centralisé (F-12)
//
// Source unique consommée par AppSidebar (rendu groupé) + Breadcrumb (label
// page courante depuis pathname). Ajout d'une route = 1 ligne à modifier.
//
// Note typage AuthRole : duplication locale (vs import depuis infrastructure/
// auth) car les boundaries ESLint interdisent `components → infrastructure`.
// Le type est strictement identique à AuthRole de infrastructure/auth/types.
// Si ce type doit être partagé ailleurs (UI conditionnel par rôle), envisager
// extraction vers shared/ — refactor non-bloquant F-13+.
// ==============================================================================

import {
  BarChart3,
  Bell,
  BellRing,
  Building2,
  FileBox,
  FileText,
  History,
  LayoutDashboard,
  type LucideIcon,
  Package,
  RefreshCw,
  Settings,
  Workflow,
} from "lucide-react";

type Role = "SADMIN" | "ADMIN" | "USER";

export type NavGroupKey = "management" | "monitoring" | "reports" | "system" | "settings";

export interface NavRoute {
  readonly href: string;
  /** Clé i18n sous nav.items.* (ex: "dashboard" → t("dashboard")). */
  readonly labelKey: string;
  readonly icon: LucideIcon;
  readonly group: NavGroupKey;
  /** Rôle minimum pour voir l'item dans la sidebar. undefined = tous (USER+). */
  readonly minRole?: Role;
}

export const NAV_ROUTES: readonly NavRoute[] = [
  // Gestion
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard, group: "management" },
  { href: "/clients", labelKey: "clients", icon: Building2, group: "management" },
  { href: "/licences", labelKey: "licences", icon: FileText, group: "management" },
  { href: "/volumes", labelKey: "articles", icon: Package, group: "management" },
  { href: "/renewals", labelKey: "renewals", icon: RefreshCw, group: "management" },
  // Surveillance
  { href: "/alerts", labelKey: "alerts", icon: Bell, group: "monitoring", minRole: "ADMIN" },
  { href: "/notifications", labelKey: "notifications", icon: BellRing, group: "monitoring" },
  // Rapports
  { href: "/reports", labelKey: "reportsList", icon: BarChart3, group: "reports" },
  { href: "/files", labelKey: "files", icon: FileBox, group: "reports", minRole: "ADMIN" },
  // Système
  { href: "/history", labelKey: "auditLog", icon: History, group: "system" },
  { href: "/batches", labelKey: "batches", icon: Workflow, group: "system", minRole: "ADMIN" },
  // Paramétrage isolé en bas (SADMIN uniquement)
  { href: "/settings", labelKey: "settings", icon: Settings, group: "settings", minRole: "SADMIN" },
];

/** Ordre d'affichage des 4 groupes principaux. Paramétrage est rendu séparément
 *  (pied de sidebar via mt-auto). */
export const NAV_GROUP_ORDER: readonly NavGroupKey[] = [
  "management",
  "monitoring",
  "reports",
  "system",
];

const ROLE_RANK: Readonly<Record<Role, number>> = { USER: 0, ADMIN: 1, SADMIN: 2 };

export function canSeeRoute(route: NavRoute, role: Role): boolean {
  if (route.minRole === undefined) return true;
  return ROLE_RANK[role] >= ROLE_RANK[route.minRole];
}

export function findRouteByPathname(pathname: string): NavRoute | undefined {
  return NAV_ROUTES.find((r) => r.href === pathname);
}
