// ==============================================================================
// LIC v2 — /clients/[id]/entites (Phase 4 étape 4.F)
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import { getClientUseCase, listEntitesByClientUseCase } from "@/server/composition-root";

import { EntitesTab } from "../_components/EntitesTab";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ClientEntitesPage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  // Vérif existence client + rejet 404 propre.
  try {
    await getClientUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-724") notFound();
    throw err;
  }

  const entites = await listEntitesByClientUseCase.execute(id);

  return (
    <EntitesTab
      clientId={id}
      rows={entites}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
    />
  );
}
