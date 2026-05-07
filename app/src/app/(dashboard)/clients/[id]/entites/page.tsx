// ==============================================================================
// LIC v2 — /clients/[id]/entites (Phase 4 étape 4.F + Phase 23 select pays)
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import { getClientUseCase, listEntitesByClientUseCase } from "@/server/composition-root";
import { getCachedPays } from "@/lib/cached-referentials";

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

  const [entites, paysAll] = await Promise.all([
    listEntitesByClientUseCase.execute(id),
    getCachedPays(),
  ]);
  const paysList = paysAll.filter((p) => p.actif).map((p) => ({ code: p.codePays, label: p.nom }));

  return (
    <EntitesTab
      clientId={id}
      rows={entites}
      paysList={paysList}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
    />
  );
}
