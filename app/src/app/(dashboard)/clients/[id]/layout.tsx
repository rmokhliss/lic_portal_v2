// ==============================================================================
// LIC v2 — /clients/[id] layout (Phase 4 étape 4.F + Phase 10.D)
//
// Server Component partagé entre les 5 sub-routes (info, entites, contacts,
// licences, historique). Fetch le client (notFound si absent), affiche
// header (back link + raison sociale + statut + boutons) + tabs nav, puis
// rend {children} (la page de l'onglet actif).
//
// Phase 10.D : bouton « Importer healthcheck » DÉBLOQUÉ. Le parsing CSV/JSON
// fonctionne sans PKI ; la vérification de signature certificat client reste
// différée Phase 3 (DETTE-LIC-008) — note dans le Dialog.
// ==============================================================================

import type { ReactNode } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { requireAuthPage } from "@/server/infrastructure/auth";
import { isAppError } from "@/server/modules/error";
import { getClientUseCase } from "@/server/composition-root";

import { EntityNameSetter } from "@/components/layout/EntityNameContext";

import { ClientStatusBadge } from "../_components/ClientStatusBadge";
import { ClientDetailTabsNav } from "./_components/ClientDetailTabsNav";

interface ClientDetailLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ClientDetailLayout({ children, params }: ClientDetailLayoutProps) {
  const { id } = await params;
  const t = await getTranslations("clients.detail");
  const user = await requireAuthPage();

  let client;
  try {
    client = await getClientUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-724") {
      notFound();
    }
    throw err;
  }

  return (
    <div className="p-8">
      {/* Phase 16 — DETTE-LIC-009 : pousse raisonSociale dans EntityNameContext
           pour le breadcrumb dynamique "Clients › <raisonSociale> › Info". */}
      <EntityNameSetter name={client.raisonSociale} />
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
      </header>

      <ClientDetailTabsNav clientId={id} userRole={user.role} />

      <div className="mt-8">{children}</div>
    </div>
  );
}
