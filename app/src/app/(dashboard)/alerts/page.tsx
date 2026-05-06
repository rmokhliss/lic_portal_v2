// ==============================================================================
// LIC v2 — /alerts (Phase 17 S4)
//
// Vue cross-clients de la configuration des alertes (seuils volume/date).
// Server Component, requireRolePage(["ADMIN", "SADMIN"]). Passe les configs
// + la liste des clients à AlertsPanel (Client Component) qui gère le CRUD
// via dialogs + Server Actions /alerts/_actions.ts.
// ==============================================================================

import { requireRolePage } from "@/server/infrastructure/auth";
import { listAllAlertConfigsUseCase, listClientsUseCase } from "@/server/composition-root";

import { AlertsPanel } from "./_components/AlertsPanel";

export default async function AlertsPage(): Promise<React.JSX.Element> {
  await requireRolePage(["ADMIN", "SADMIN"]);

  const [configs, clientsPage] = await Promise.all([
    listAllAlertConfigsUseCase.execute(),
    listClientsUseCase.execute({ limit: 200 }),
  ]);

  const clients = clientsPage.items.map((c) => ({
    id: c.id,
    codeClient: c.codeClient,
    raisonSociale: c.raisonSociale,
  }));

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="font-display text-foreground text-2xl">Alertes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configuration des seuils d&apos;alerte par client (volume %, date jours). {configs.length}{" "}
          alerte(s) configurée(s).
        </p>
      </header>
      <AlertsPanel configs={configs} clients={clients} />
    </div>
  );
}
