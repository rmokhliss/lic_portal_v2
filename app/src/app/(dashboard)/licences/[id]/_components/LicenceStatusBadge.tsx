// ==============================================================================
// LIC v2 — LicenceStatusBadge (page détail licence Phase 5.F)
// ==============================================================================

import type { LicenceStatusClient } from "./licence-detail-types";

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
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 font-mono text-xs ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
