// ==============================================================================
// LIC v2 — LicenceStatusBadge (Phase 5)
// ACTIF=vert / SUSPENDU=orange / INACTIF=gris / EXPIRE=rouge.
// ==============================================================================

import { useTranslations } from "next-intl";

import type { LicenceStatusClient } from "./licence-types";

const STYLES: Record<LicenceStatusClient, string> = {
  ACTIF: "bg-success/15 text-success border-success/40",
  SUSPENDU: "bg-warning/15 text-warning border-warning/40",
  INACTIF: "bg-muted text-muted-foreground border-border",
  EXPIRE: "bg-destructive/15 text-destructive border-destructive/40",
};

export interface LicenceStatusBadgeProps {
  readonly status: LicenceStatusClient;
}

export function LicenceStatusBadge({ status }: LicenceStatusBadgeProps) {
  const t = useTranslations("clients.detail.licencesTab");
  // Réutilise les libellés génériques table.* en attendant un namespace dédié.
  // Les 4 statuts sont aussi affichés tels quels en font-mono pour rester
  // explicites côté SADMIN.
  void t; // évite warning si unused
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 font-mono text-xs ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
