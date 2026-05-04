// ==============================================================================
// LIC v2 — /clients/[id] layout (Phase 4 étape 4.F)
//
// Server Component partagé entre les 5 sub-routes (info, entites, contacts,
// licences, historique). Fetch le client (notFound si absent), affiche
// header (back link + raison sociale + statut + boutons) + tabs nav, puis
// rend {children} (la page de l'onglet actif).
//
// Le bouton « Importer healthcheck » est désactivé avec tooltip jusqu'à la
// Phase 3 (PKI). Décision cadrage Phase 4 — bouton visible mais inactif pour
// préfigurer l'UX cible et matérialiser DETTE-LIC-008.
// ==============================================================================

import type { ReactNode } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { isAppError } from "@/server/modules/error";
import { getClientUseCase } from "@/server/composition-root";

import { ClientStatusBadge } from "../_components/ClientStatusBadge";
import { ClientDetailTabsNav } from "./_components/ClientDetailTabsNav";

interface ClientDetailLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ClientDetailLayout({ children, params }: ClientDetailLayoutProps) {
  const { id } = await params;
  const t = await getTranslations("clients.detail");

  let client;
  try {
    client = await getClientUseCase.execute(id);
  } catch (err) {
    // SPX-LIC-724 NotFoundError → 404 Next.js. Toute autre erreur remonte.
    if (isAppError(err) && err.code === "SPX-LIC-724") {
      notFound();
    }
    throw err;
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/clients"
            className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider"
          >
            {t("back")}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-foreground text-2xl">{client.raisonSociale}</h1>
            <span className="text-muted-foreground font-mono text-sm">({client.codeClient})</span>
            <ClientStatusBadge statut={client.statutClient} />
          </div>
        </div>
        <Button type="button" variant="outline" disabled title={t("importHealthcheckTooltip")}>
          {t("importHealthcheck")}
        </Button>
      </header>

      <ClientDetailTabsNav clientId={id} />

      <div className="mt-8">{children}</div>
    </div>
  );
}
