// ==============================================================================
// LIC v2 — /clients/[id]/historique (Phase 7.B)
// Tab débloquée : journal d'audit scope client (direct + indirect entités/
// licences/contacts/renouvellements/liaisons).
// ==============================================================================

import { notFound } from "next/navigation";

import { AuditHistoryTable } from "@/components/shared/AuditHistoryTable";
import { requireAuthPage } from "@/server/infrastructure/auth";
import { getClientUseCase, listAuditByClientScopeUseCase } from "@/server/composition-root";
import { isAppError } from "@/server/modules/error";
import { AUDIT_ACTIONS_CATALOG } from "@/server/modules/audit-query/audit-actions-catalog";

import { fetchClientHistoriqueAction } from "../_actions";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ClientHistoriquePage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  // Réservé ADMIN/SADMIN — l'historique expose des données d'audit sensibles.
  if (user.role !== "ADMIN" && user.role !== "SADMIN") notFound();

  try {
    await getClientUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-712") notFound();
    throw err;
  }

  const initialPage = await listAuditByClientScopeUseCase.execute({
    clientId: id,
    filters: { limit: 50 },
  });

  const fetchPage = async (input: {
    cursor?: string;
    action?: string;
    acteur?: string;
  }): Promise<{
    items: typeof initialPage.items;
    nextCursor: string | null;
  }> => {
    "use server";
    return fetchClientHistoriqueAction({
      clientId: id,
      ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
      ...(input.action !== undefined ? { action: input.action } : {}),
      ...(input.acteur !== undefined ? { acteur: input.acteur } : {}),
    });
  };

  return (
    <AuditHistoryTable
      initialPage={initialPage}
      fetchPage={fetchPage}
      actionsCatalog={AUDIT_ACTIONS_CATALOG}
    />
  );
}
