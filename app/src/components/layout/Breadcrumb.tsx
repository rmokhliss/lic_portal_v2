// ==============================================================================
// LIC v2 — Breadcrumb (Client Component, F-12 + Phase 11.C dynamique)
//
// Phase 11.C — DETTE-LIC-009 partiellement résolue : pattern matching pour les
// routes détail `/clients/[id]/*` et `/licences/[id]/*` afin d'afficher
// "Clients › Détail › Info" plutôt que le pathname brut avec UUID.
//
// Le rendu reste statique (pas de fetch entité — la résolution dynamique
// "Clients › Bank Al-Maghrib › Info" demanderait un context Server → Client
// non trivial à matérialiser via Next.js layouts. Conservée en dette résiduelle).
// ==============================================================================

"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { findRouteByPathname } from "./nav-routes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function Breadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("nav.items");
  const tBc = useTranslations("nav.breadcrumb");

  // Match exact d'abord (route principale).
  const route = findRouteByPathname(pathname);
  if (route !== undefined) {
    return <Crumb>{t(route.labelKey)}</Crumb>;
  }

  // Pattern /clients/[uuid]/sub ou /licences/[uuid]/sub.
  const segments = pathname.split("/").filter((s) => s.length > 0);
  if (segments.length >= 2 && UUID_PATTERN.test(segments[1] ?? "")) {
    const root = segments[0];
    const sub = segments[2];
    if (root === "clients") {
      return (
        <Crumb>
          {t("clients")}
          {sub === undefined ? "" : ` › ${tBc("detail")} › ${labelSub(sub, tBc)}`}
        </Crumb>
      );
    }
    if (root === "licences") {
      return (
        <Crumb>
          {t("licences")}
          {sub === undefined ? "" : ` › ${tBc("detail")} › ${labelSub(sub, tBc)}`}
        </Crumb>
      );
    }
  }

  // Fallback : pathname brut.
  return <Crumb>{pathname}</Crumb>;
}

function labelSub(sub: string, tBc: (key: string) => string): string {
  // Tente la clé i18n nav.breadcrumb.<sub> ; à défaut, capitalise la 1re lettre.
  try {
    return tBc(sub);
  } catch {
    return sub.charAt(0).toUpperCase() + sub.slice(1);
  }
}

function Crumb({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="font-display text-foreground text-sm font-extrabold uppercase tracking-wider">
      {children}
    </span>
  );
}
