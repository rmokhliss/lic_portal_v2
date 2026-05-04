// ==============================================================================
// LIC v2 — /licences/[id]/resume (Phase 5.F)
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import { getClientUseCase, getEntiteUseCase, getLicenceUseCase } from "@/server/composition-root";

import { LicenceResumeTab } from "../_components/LicenceResumeTab";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function LicenceResumePage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  let licence;
  try {
    licence = await getLicenceUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-735") notFound();
    throw err;
  }

  // Résolution display client + entité (best-effort, fallback sur ids).
  const [client, entite] = await Promise.all([
    getClientUseCase.execute(licence.clientId).catch(() => null),
    getEntiteUseCase.execute(licence.entiteId).catch(() => null),
  ]);

  return (
    <LicenceResumeTab
      licence={licence}
      clientLabel={
        client !== null ? `${client.codeClient} — ${client.raisonSociale}` : licence.clientId
      }
      entiteLabel={entite !== null ? entite.nom : licence.entiteId}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
    />
  );
}
