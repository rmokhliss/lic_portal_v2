// ==============================================================================
// LIC v2 — /clients/[id]/licences (Phase 5 étape 5.E — était stub Phase 5)
//
// Server Component : fetch entités + licences du client, rend LicencesTab.
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getClientUseCase,
  listEntitesByClientUseCase,
  listLicencesByClientUseCase,
} from "@/server/composition-root";

import { LicencesTab } from "../_components/LicencesTab";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ClientLicencesPage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  try {
    await getClientUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-724") notFound();
    throw err;
  }

  const [entites, licencesPage] = await Promise.all([
    listEntitesByClientUseCase.execute(id),
    listLicencesByClientUseCase.execute({ clientId: id, limit: 100 }),
  ]);

  return (
    <LicencesTab
      clientId={id}
      entites={entites}
      licences={licencesPage.items}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
    />
  );
}
