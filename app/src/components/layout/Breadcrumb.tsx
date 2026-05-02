// ==============================================================================
// LIC v2 — Breadcrumb (Client Component, F-12)
//
// Page courante seulement (pas de chemin parent). Lit pathname via
// usePathname() côté client + match contre NAV_ROUTES pour récupérer la clé
// i18n. Fallback : pathname brut si route inconnue (ex: /profile, /change-password).
// ==============================================================================

"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { findRouteByPathname } from "./nav-routes";

export function Breadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("nav.items");
  const route = findRouteByPathname(pathname);
  const label = route !== undefined ? t(route.labelKey) : pathname;

  return (
    <span className="font-display text-foreground text-sm font-extrabold uppercase tracking-wider">
      {label}
    </span>
  );
}
