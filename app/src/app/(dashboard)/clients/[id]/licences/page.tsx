// LIC v2 — /clients/[id]/licences (Phase 4 étape 4.F, stub Phase 5)

import { getTranslations } from "next-intl/server";

import { PhaseStub } from "@/components/shared/PhaseStub";

export default async function ClientLicencesPage() {
  const t = await getTranslations("clients.detail.tabs");
  return (
    <PhaseStub
      phase="5"
      label={t("licences")}
      description="Gestion du contrat de licence (référence, période, statut, modules autorisés)."
    />
  );
}
