// ==============================================================================
// LIC v2 — /licences/[id] layout (Phase 5.F)
// Server Component : fetch licence + client (display) + tabs nav.
// ==============================================================================

import type { ReactNode } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { isAppError } from "@/server/modules/error";
import { getClientUseCase, getLicenceUseCase } from "@/server/composition-root";

import { LicenceDetailTabsNav } from "./_components/LicenceDetailTabsNav";
import { LicenceStatusBadge } from "./_components/LicenceStatusBadge";

interface PageProps {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly id: string }>;
}

export default async function LicenceDetailLayout({ children, params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("licences");

  let licence;
  try {
    licence = await getLicenceUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-735") notFound();
    throw err;
  }

  // Display client en parallèle pour breadcrumb (raisonSociale).
  const client = await getClientUseCase.execute(licence.clientId).catch(() => null);

  return (
    <div className="p-8">
      <header className="mb-6 space-y-2">
        <Link
          href={`/clients/${licence.clientId}/licences`}
          className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider"
        >
          {t("back")}
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-foreground text-2xl">{licence.reference}</h1>
          <span className="text-muted-foreground text-sm">
            {client !== null ? `— ${client.raisonSociale}` : ""}
          </span>
          <LicenceStatusBadge status={licence.status} />
        </div>
      </header>

      <LicenceDetailTabsNav licenceId={id} />

      <div className="mt-8">{children}</div>
    </div>
  );
}
