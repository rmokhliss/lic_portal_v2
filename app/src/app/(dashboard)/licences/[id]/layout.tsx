// ==============================================================================
// LIC v2 — /licences/[id] layout (Phase 5.F)
// Server Component : fetch licence + client (display) + tabs nav.
// ==============================================================================

import type { ReactNode } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { isAppError } from "@/server/modules/error";
import {
  getClientUseCase,
  getLicenceUseCase,
  getLicFileStaleStatusUseCase,
} from "@/server/composition-root";

import { EntityNameSetter } from "@/components/layout/EntityNameContext";

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
  const [client, licFileStatus] = await Promise.all([
    getClientUseCase.execute(licence.clientId).catch(() => null),
    // Phase 23 — statut fichier .lic (never/fresh/stale) pour banniere
    // commune a tous les onglets (resume + articles + renouvellements +
    // historique). Detection automatique des modifications post-generation.
    getLicFileStaleStatusUseCase.execute(id).catch(() => null),
  ]);

  return (
    <div className="p-8">
      {/* Phase 16 — DETTE-LIC-009 : pousse reference dans EntityNameContext
           pour le breadcrumb dynamique "Licences › LIC-2026-001 › Resume". */}
      <EntityNameSetter name={licence.reference} />
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

      {/* Phase 23 — banniere "fichier .lic obsolete" visible sur tous les
           onglets (le user peut modifier articles/produits depuis n'importe
           quelle vue, on alerte partout que le .lic doit etre regenere). */}
      {licFileStatus !== null && licFileStatus.status === "stale" && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p className="font-medium">⚠ Fichier .lic obsolète</p>
          <p className="mt-1 text-xs">
            Le contenu produit / article / volume a été modifié depuis la dernière génération (
            {new Date(licFileStatus.generatedAt).toLocaleString("fr-FR")}). Régénérer le fichier
            .lic dans l&apos;onglet Résumé pour que le client reçoive la dernière configuration.
          </p>
        </div>
      )}

      <LicenceDetailTabsNav licenceId={id} />

      <div className="mt-8">{children}</div>
    </div>
  );
}
