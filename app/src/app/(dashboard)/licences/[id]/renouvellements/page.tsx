// ==============================================================================
// LIC v2 — /licences/[id]/renouvellements (Phase 5.F)
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import { getLicenceUseCase, listRenouvellementsByLicenceUseCase } from "@/server/composition-root";

import { RenouvellementsTab } from "../_components/RenouvellementsTab";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function LicenceRenouvellementsPage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  try {
    await getLicenceUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-735") notFound();
    throw err;
  }

  const renouvellements = await listRenouvellementsByLicenceUseCase.execute(id);

  return (
    <RenouvellementsTab
      licenceId={id}
      renouvellements={renouvellements}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
    />
  );
}
