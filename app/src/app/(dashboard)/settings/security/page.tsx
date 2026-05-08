// ==============================================================================
// LIC v2 — /settings/security (Phase 3.C — CA management, i18n Phase 16)
// ==============================================================================

import { getTranslations } from "next-intl/server";

import { requireRolePage } from "@/server/infrastructure/auth";
import { backfillClientCertificatesUseCase, getCAStatusUseCase } from "@/server/composition-root";
import { settingRepository } from "@/server/modules/settings/settings.module";

import { CASection } from "./_components/CASection";

export default async function SettingsSecurityPage(): Promise<React.JSX.Element> {
  await requireRolePage(["SADMIN"]);
  const t = await getTranslations("settings.security");
  const status = await getCAStatusUseCase.execute();
  const initialStatus = {
    exists: status.exists,
    expiresAt: status.expiresAt?.toISOString() ?? null,
    subjectCN: status.subjectCN,
    generatedAt: status.generatedAt?.toISOString() ?? null,
  };
  const pendingCount = status.exists ? await backfillClientCertificatesUseCase.countPending() : 0;
  const allSettings = await settingRepository.findAll();
  const exposeSetting = allSettings.find((s) => s.key === "expose_s2m_ca_public");
  const initialExposeCaPublic = exposeSetting?.value === true;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-foregroundtext-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>

      <CASection
        initialStatus={initialStatus}
        initialBackfillStatus={{ pendingCount }}
        initialExposeCaPublic={initialExposeCaPublic}
      />
    </div>
  );
}
