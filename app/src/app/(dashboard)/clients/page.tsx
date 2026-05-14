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
import {
  getCAStatusUseCase,
  listClientsRefUseCase,
  listClientsUseCase,
  listTypesContactUseCase,
} from "@/server/composition-root";
import {
  getCachedDevises,
  getCachedLangues,
  getCachedPays,
  getCachedRegions,
  getCachedTeamMembersByRole,
} from "@/lib/cached-referentials";

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
    /** Phase 20 R-29 — filtres enrichis. */
    readonly pays?: string;
    readonly am?: string;
    readonly sales?: string;
    /** Phase 21 R-29 — région (sub-query lic_pays_ref). */
    readonly region?: string;
    /** Phase 21 R-29 — checkbox 'Sans licence active' (string '1' = true). */
    readonly sansLicence?: string;
  }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const user = await requireAuthPage();
  const params = await searchParams;

  const statutFilter: ClientStatutClient | undefined =
    params.statut !== undefined && VALID_STATUTS.has(params.statut as ClientStatutClient)
      ? (params.statut as ClientStatutClient)
      : undefined;
  // Phase 20 R-29 — propage les filtres pays/AM/sales (string non-vide).
  const paysFilter =
    params.pays !== undefined && params.pays.trim().length > 0 ? params.pays.trim() : undefined;
  const amFilter =
    params.am !== undefined && params.am.trim().length > 0 ? params.am.trim() : undefined;
  const salesFilter =
    params.sales !== undefined && params.sales.trim().length > 0 ? params.sales.trim() : undefined;
  // Phase 21 R-29 — filtre région + checkbox sans-licence.
  const regionFilter =
    params.region !== undefined && params.region.trim().length > 0
      ? params.region.trim()
      : undefined;
  const sansLicenceFilter = params.sansLicence === "1";

  // Phase 18 R-09/R-10 — fallback gracieux sur listTypesContactUseCase :
  // si l'appel échoue (BD démo non seedée, types contact vides), le tableau
  // des clients reste utilisable et le formulaire de création affiche un
  // message guidant l'utilisateur vers /settings/team plutôt que de crasher.
  const [
    result,
    caStatus,
    paysAll,
    devisesAll,
    languesAll,
    salesAll,
    amAll,
    typesContactAll,
    regionsAll,
    clientsRefResult,
  ] = await Promise.all([
    listClientsUseCase.execute({
      ...(params.cursor !== undefined ? { cursor: params.cursor } : {}),
      ...(params.q !== undefined && params.q.trim().length > 0 ? { q: params.q.trim() } : {}),
      ...(statutFilter !== undefined ? { statutClient: statutFilter } : {}),
      ...(paysFilter !== undefined ? { codePays: paysFilter } : {}),
      ...(amFilter !== undefined ? { accountManager: amFilter } : {}),
      ...(salesFilter !== undefined ? { salesResponsable: salesFilter } : {}),
      ...(regionFilter !== undefined ? { regionCode: regionFilter } : {}),
      ...(sansLicenceFilter ? { sansLicence: true } : {}),
      limit: 25,
    }),
    getCAStatusUseCase.execute(),
    // T-01 + Phase 22 R-44 — référentiels SADMIN cachés 60s pour les <select>
    // (codes actifs only). Invalidés via revalidateTag dans
    // settings/_actions.ts à chaque mutation référentielle.
    getCachedPays(),
    getCachedDevises(),
    getCachedLangues(),
    getCachedTeamMembersByRole("SALES"),
    getCachedTeamMembersByRole("AM"),
    // Phase 14 — DETTE-LIC-017 : types contact pour la section contacts à création.
    listTypesContactUseCase.execute({}).catch(() => [] as const),
    // Phase 21 R-29 + Phase 22 R-44 — régions cachées 60s.
    getCachedRegions(),
    // Phase 24 — référentiel clients S2M (autocomplete codeClient à création).
    // Lecture seule, volumétrie ≤ 200 — chargement complet sans pagination.
    listClientsRefUseCase.execute({ actif: true, limit: 500 }),
  ]);

  const paysList = paysAll.filter((p) => p.actif).map((p) => ({ code: p.codePays, label: p.nom }));
  const devisesList = devisesAll
    .filter((d) => d.actif)
    .map((d) => ({ code: d.codeDevise, label: d.nom }));
  const languesList = languesAll
    .filter((l) => l.actif)
    .map((l) => ({ code: l.codeLangue, label: l.nom }));
  // Phase 21 R-29 — régions actives pour le select filtre.
  const regionsList = regionsAll
    .filter((r) => r.actif)
    .map((r) => ({ code: r.regionCode, label: r.nom }));
  // T-01 : valeur stockée = display "Prénom NOM" (lic_clients.* sont des string
  // libres, pas FK). Format aligné L9 (sans matricule — team_members n'en a pas).
  const formatTeamMember = (m: { prenom: string | null; nom: string }): string =>
    m.prenom !== null && m.prenom !== "" ? `${m.prenom} ${m.nom}` : m.nom;
  const salesList = salesAll.map((m) => ({
    code: formatTeamMember(m),
    label: formatTeamMember(m),
  }));
  const amList = amAll.map((m) => ({ code: formatTeamMember(m), label: formatTeamMember(m) }));
  // Phase 14 — types contact actifs pour la section contacts à création.
  const typesContactList = typesContactAll
    .filter((t) => t.actif)
    .map((t) => ({ code: t.code, label: t.libelle }));
  // Phase 24 — référentiel clients (code + raison sociale) pour l'autocomplete.
  const clientsRefList = clientsRefResult.items.map((c) => ({
    codeClient: c.codeClient,
    raisonSociale: c.raisonSociale,
  }));

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
        // Phase 20 R-29 — filtres enrichis + total.
        currentPays={paysFilter ?? ""}
        currentAm={amFilter ?? ""}
        currentSales={salesFilter ?? ""}
        // Phase 21 R-29 — région + sansLicence.
        currentRegion={regionFilter ?? ""}
        currentSansLicence={sansLicenceFilter}
        regionsList={regionsList}
        total={result.total}
        canCreate={canCreateBase && !caMissing}
        paysList={paysList}
        devisesList={devisesList}
        languesList={languesList}
        salesList={salesList}
        amList={amList}
        typesContactList={typesContactList}
        clientsRefList={clientsRefList}
      />
    </div>
  );
}
