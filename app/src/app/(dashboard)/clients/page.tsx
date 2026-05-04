// ==============================================================================
// LIC v2 — /clients (Phase 4 étape 4.E — EC-Clients liste)
//
// Server Component. Lit searchParams (cursor + q + statut), appelle
// listClientsUseCase, render ClientsTable Client Component avec les rows.
//
// Auth : `requireAuthPage` couvre la session (layout). Tous les rôles ont
// accès en lecture (USER/ADMIN/SADMIN). La création est gardée côté
// Server Action (requireRole ADMIN/SADMIN).
// ==============================================================================

import { requireAuthPage } from "@/server/infrastructure/auth";
import { listClientsUseCase } from "@/server/composition-root";

import { ClientsTable } from "./_components/ClientsTable";
import type { ClientStatutClient } from "./_components/clients-types";

const VALID_STATUTS: ReadonlySet<ClientStatutClient> = new Set<ClientStatutClient>([
  "PROSPECT",
  "ACTIF",
  "SUSPENDU",
  "RESILIE",
]);

interface ClientsPageProps {
  readonly searchParams: Promise<{
    readonly cursor?: string;
    readonly q?: string;
    readonly statut?: string;
  }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const user = await requireAuthPage();
  const params = await searchParams;

  const statutFilter: ClientStatutClient | undefined =
    params.statut !== undefined && VALID_STATUTS.has(params.statut as ClientStatutClient)
      ? (params.statut as ClientStatutClient)
      : undefined;

  const result = await listClientsUseCase.execute({
    ...(params.cursor !== undefined ? { cursor: params.cursor } : {}),
    ...(params.q !== undefined && params.q.trim().length > 0 ? { q: params.q.trim() } : {}),
    ...(statutFilter !== undefined ? { statutClient: statutFilter } : {}),
    limit: 25,
  });

  return (
    <ClientsTable
      rows={result.items}
      nextCursor={result.nextCursor}
      currentCursor={params.cursor ?? null}
      currentQuery={params.q ?? ""}
      currentStatut={statutFilter ?? null}
      canCreate={user.role === "ADMIN" || user.role === "SADMIN"}
    />
  );
}
