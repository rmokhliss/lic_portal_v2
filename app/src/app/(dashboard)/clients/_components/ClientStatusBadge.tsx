// ==============================================================================
// LIC v2 — ClientStatusBadge (Phase 4 étape 4.E)
//
// Server Component présentationnel. Couleurs DS (semantic tokens) :
//   PROSPECT  → bleu (info)        — en cours de qualification
//   ACTIF     → vert (success)     — contrat signé, opérationnel
//   SUSPENDU  → orange (warning)   — temporaire (paiement, etc.)
//   RESILIE   → rouge (destructive) — terminal
// ==============================================================================

import { useTranslations } from "next-intl";

import type { ClientStatutClient } from "./clients-types";

const STYLES: Record<ClientStatutClient, string> = {
  PROSPECT: "bg-info/15 text-info border-info/40",
  ACTIF: "bg-success/15 text-success border-success/40",
  SUSPENDU: "bg-warning/15 text-warning border-warning/40",
  RESILIE: "bg-destructive/15 text-destructive border-destructive/40",
};

export interface ClientStatusBadgeProps {
  readonly statut: ClientStatutClient;
}

export function ClientStatusBadge({ statut }: ClientStatusBadgeProps) {
  const t = useTranslations("clients.statut");
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[statut]}`}
    >
      {t(statut)}
    </span>
  );
}
