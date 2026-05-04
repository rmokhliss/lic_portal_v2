// ==============================================================================
// LIC v2 — /audit (Phase 7.C, EC-06)
// Journal d'audit global. ADMIN/SADMIN. Filtres période + action + acteur +
// entité. Export CSV.
// ==============================================================================

import { notFound } from "next/navigation";

import { requireAuthPage } from "@/server/infrastructure/auth";
import { searchAuditUseCase } from "@/server/composition-root";
import { AUDIT_ACTIONS_CATALOG } from "@/server/modules/audit-query/audit-actions-catalog";

import { searchAuditAction } from "./_actions";
import { AuditPageClient } from "./_components/AuditPageClient";

const ENTITIES_CATALOG: readonly string[] = [
  "client",
  "entite",
  "contact",
  "licence",
  "renouvellement",
  "licence-produit",
  "licence-article",
  "user",
];

export default async function AuditPage() {
  const user = await requireAuthPage();
  if (user.role !== "ADMIN" && user.role !== "SADMIN") notFound();

  const initialPage = await searchAuditUseCase.execute({ limit: 50 });

  const fetchPage = async (input: {
    cursor?: string;
    action?: string;
    acteur?: string;
  }): Promise<{
    items: typeof initialPage.items;
    nextCursor: string | null;
  }> => {
    "use server";
    return searchAuditAction({
      ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
      ...(input.action !== undefined ? { action: input.action } : {}),
      ...(input.acteur !== undefined ? { acteur: input.acteur } : {}),
    });
  };

  return (
    <AuditPageClient
      initialPage={initialPage}
      fetchPage={fetchPage}
      actionsCatalog={AUDIT_ACTIONS_CATALOG}
      entitiesCatalog={ENTITIES_CATALOG}
    />
  );
}
