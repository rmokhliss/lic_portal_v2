// ==============================================================================
// LIC v2 — Breadcrumb (Client Component, F-12 + Phase 11.C + Phase 16)
//
// Phase 16 — DETTE-LIC-009 résolue : nom d'entité dynamique via
// EntityNameContext. Les layouts /clients/[id] et /licences/[id] poussent
// le nom (raisonSociale / reference) via EntityNameSetter ; ce composant le
// consomme pour afficher "Clients › Bank Al-Maghrib › Info" au lieu de
// "Clients › Détail › Info".
//
// Fallback "Détail" conservé pour le bref instant entre le mount et le
// useEffect du EntityNameSetter (pas de flash perceptible en pratique sur
// les fetch < 100 ms).
// ==============================================================================

"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { useEntityName } from "./EntityNameContext";
import { findRouteByPathname } from "./nav-routes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function Breadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("nav.items");
  const tBc = useTranslations("nav.breadcrumb");
  const entityName = useEntityName();

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
    // Phase 16 : remplace "Détail" par le nom d'entité si disponible (Provider).
    const middle = entityName ?? tBc("detail");
    if (root === "clients") {
      return (
        <Crumb>
          {t("clients")}
          {sub === undefined ? "" : ` › ${middle} › ${labelSub(sub, tBc)}`}
        </Crumb>
      );
    }
    if (root === "licences") {
      return (
        <Crumb>
          {t("licences")}
          {sub === undefined ? "" : ` › ${middle} › ${labelSub(sub, tBc)}`}
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
