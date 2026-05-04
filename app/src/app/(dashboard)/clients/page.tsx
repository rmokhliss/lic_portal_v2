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

import Link from "next/link";

import { requireAuthPage } from "@/server/infrastructure/auth";
import { getCAStatusUseCase, listClientsUseCase } from "@/server/composition-root";

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

  const [result, caStatus] = await Promise.all([
    listClientsUseCase.execute({
      ...(params.cursor !== undefined ? { cursor: params.cursor } : {}),
      ...(params.q !== undefined && params.q.trim().length > 0 ? { q: params.q.trim() } : {}),
      ...(statutFilter !== undefined ? { statutClient: statutFilter } : {}),
      limit: 25,
    }),
    getCAStatusUseCase.execute(),
  ]);

  // Phase 3.H — bandeau alerte si CA absente : la création client est bloquée
  // (createClientUseCase throw SPX-LIC-411 sans CA). On désactive le bouton
  // "Nouveau client" en propageant `canCreate=false` quand CA manquante.
  const caMissing = !caStatus.exists;
  const canCreateBase = user.role === "ADMIN" || user.role === "SADMIN";

  return (
    <div className="space-y-4">
      {caMissing && (
        <div
          role="alert"
          className="rounded-lg border border-orange-300 bg-orange-50 p-4 text-sm text-orange-900"
        >
          <p className="font-medium">⚠ CA S2M non générée.</p>
          <p className="mt-1">
            Aucun client ne peut être créé tant que la CA n&apos;est pas active.{" "}
            <Link
              href="/settings/security"
              className="font-medium underline underline-offset-2 hover:text-orange-700"
            >
              Générer la CA
            </Link>
            .
          </p>
        </div>
      )}
      <ClientsTable
        rows={result.items}
        nextCursor={result.nextCursor}
        currentCursor={params.cursor ?? null}
        currentQuery={params.q ?? ""}
        currentStatut={statutFilter ?? null}
        canCreate={canCreateBase && !caMissing}
      />
    </div>
  );
}
