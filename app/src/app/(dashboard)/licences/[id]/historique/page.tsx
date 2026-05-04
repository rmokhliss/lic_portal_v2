// ==============================================================================
// LIC v2 — /licences/[id]/historique (Phase 7.B)
// Tab débloquée : journal d'audit scope licence (direct + via articles/
// produits/renouvellements).
// ==============================================================================

import { notFound } from "next/navigation";

import { AuditHistoryTable } from "@/components/shared/AuditHistoryTable";
import { requireAuthPage } from "@/server/infrastructure/auth";
import { getLicenceUseCase, listAuditByLicenceScopeUseCase } from "@/server/composition-root";
import { isAppError } from "@/server/modules/error";
import { AUDIT_ACTIONS_CATALOG } from "@/server/modules/audit-query/audit-actions-catalog";

import { fetchLicenceHistoriqueAction } from "../_actions";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function LicenceHistoriquePage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  if (user.role !== "ADMIN" && user.role !== "SADMIN") notFound();

  try {
    await getLicenceUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-735") notFound();
    throw err;
  }

  const initialPage = await listAuditByLicenceScopeUseCase.execute({
    licenceId: id,
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
    return fetchLicenceHistoriqueAction({
      licenceId: id,
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
