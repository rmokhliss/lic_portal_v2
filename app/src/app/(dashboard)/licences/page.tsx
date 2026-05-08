// ==============================================================================
// LIC v2 — /licences (T-03 + Phase 18 R-11/R-12 + Phase 24 refacto)
//
// Server Component. Filtres GET (statut + q recherche reference) + cursor
// pagination. Le client (raisonSociale) est résolu en post-fetch via N appels
// getClientUseCase parallèles (max 50 par page).
//
// Phase 24 — refacto Client Component wrapping (cf. ClientsTable). La table
// + filtres + dialog wizard sont encapsulés dans <LicencesTable> (Client
// Component) qui reçoit toutes les data en props. Permet à l'auto-refresh
// post Server Action de re-render avec les nouveaux items sans router.refresh
// hack — pattern aligné sur /clients qui fonctionne nativement.
// ==============================================================================

import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getClientUseCase,
  getEntiteUseCase,
  getLicFileStaleStatusUseCase,
  listAllLicencesUseCase,
  listArticlesUseCase,
  listClientsUseCase,
  listProduitsUseCase,
} from "@/server/composition-root";

import { LicencesTable } from "./_components/LicencesTable";

// Phase 24 — Force dynamic rendering. La page utilise déjà cookies() via
// requireAuthPage donc elle devrait être dynamique par défaut, mais on
// l'explicite pour bloquer toute optimisation static qui pourrait servir
// des données obsolètes après mutation.
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LicencesPageProps {
  readonly searchParams: Promise<{
    readonly cursor?: string;
    readonly statut?: string;
    readonly q?: string;
    readonly clientId?: string;
  }>;
}

const VALID_STATUSES = new Set(["ACTIF", "INACTIF", "SUSPENDU", "EXPIRE"]);

type LicenceStatusFilter = "ACTIF" | "INACTIF" | "SUSPENDU" | "EXPIRE";

export default async function LicencesPage({
  searchParams,
}: LicencesPageProps): Promise<React.JSX.Element> {
  const user = await requireAuthPage();
  const params = await searchParams;

  const statusFilter: LicenceStatusFilter | undefined =
    params.statut !== undefined && VALID_STATUSES.has(params.statut)
      ? (params.statut as LicenceStatusFilter)
      : undefined;
  const qFilter = params.q !== undefined && params.q.trim().length > 0 ? params.q.trim() : "";
  const clientIdFilter =
    params.clientId !== undefined && params.clientId.trim().length > 0
      ? params.clientId.trim()
      : undefined;

  // Phase 21 R-30 — wizard de création licence : pré-charge le catalogue
  // (produits + articles actifs) en parallèle. Volume cible <50 produits et
  // <500 articles, donc pas de pagination — le filtrage est client-side dans
  // le wizard.
  const [result, clientsList, produitsAll, articlesAll] = await Promise.all([
    listAllLicencesUseCase.execute({
      ...(params.cursor !== undefined ? { cursor: params.cursor } : {}),
      ...(statusFilter !== undefined ? { status: statusFilter } : {}),
      ...(qFilter.length > 0 ? { q: qFilter } : {}),
      ...(clientIdFilter !== undefined ? { clientId: clientIdFilter } : {}),
      limit: 25,
    }),
    listClientsUseCase.execute({ limit: 200 }),
    listProduitsUseCase.execute({ actif: true }),
    listArticlesUseCase.execute({ actif: true }),
  ]);

  // Résolution clients + entités + statut stale en parallèle pour la table.
  const uniqueClientIds = Array.from(new Set(result.items.map((l) => l.clientId)));
  const uniqueEntiteIds = Array.from(new Set(result.items.map((l) => l.entiteId)));
  const [clientsArr, entitesArr, staleArr] = await Promise.all([
    Promise.all(
      uniqueClientIds.map(async (id) => {
        try {
          return await getClientUseCase.execute(id);
        } catch {
          return null;
        }
      }),
    ),
    Promise.all(
      uniqueEntiteIds.map(async (id) => {
        try {
          return await getEntiteUseCase.execute(id);
        } catch {
          return null;
        }
      }),
    ),
    Promise.all(
      result.items.map(async (l) => {
        try {
          const s = await getLicFileStaleStatusUseCase.execute(l.id);
          return { id: l.id, status: s.status };
        } catch {
          return { id: l.id, status: "never" as const };
        }
      }),
    ),
  ]);

  const clientsById: Record<string, { id: string; codeClient: string; raisonSociale: string }> = {};
  for (const c of clientsArr) {
    if (c !== null)
      clientsById[c.id] = { id: c.id, codeClient: c.codeClient, raisonSociale: c.raisonSociale };
  }
  const entitesById: Record<string, { id: string; nom: string }> = {};
  for (const e of entitesArr) {
    if (e !== null) entitesById[e.id] = { id: e.id, nom: e.nom };
  }
  const staleById: Record<string, "never" | "fresh" | "stale"> = {};
  for (const s of staleArr) {
    staleById[s.id] = s.status;
  }
  const staleCount = staleArr.filter((s) => s.status === "stale").length;

  const dialogClients = clientsList.items.map((c) => ({
    id: c.id,
    codeClient: c.codeClient,
    raisonSociale: c.raisonSociale,
  }));

  const dialogProduits = produitsAll.map((p) => ({
    id: p.id,
    code: p.code,
    nom: p.nom,
  }));
  const dialogArticles = articlesAll.map((a) => ({
    id: a.id,
    produitId: a.produitId,
    code: a.code,
    nom: a.nom,
    uniteVolume: a.uniteVolume,
    controleVolume: a.controleVolume,
  }));

  const canCreate = user.role === "ADMIN" || user.role === "SADMIN";

  const rows = result.items.map((l) => ({
    id: l.id,
    reference: l.reference,
    clientId: l.clientId,
    entiteId: l.entiteId,
    status: l.status,
    dateDebut: l.dateDebut,
    dateFin: l.dateFin,
  }));

  return (
    <LicencesTable
      rows={rows}
      nextCursor={result.nextCursor}
      currentCursor={params.cursor ?? null}
      currentQuery={qFilter}
      currentStatut={statusFilter ?? null}
      currentClientId={clientIdFilter ?? null}
      clientsById={clientsById}
      entitesById={entitesById}
      staleById={staleById}
      staleCount={staleCount}
      canCreate={canCreate}
      dialogClients={dialogClients}
      dialogProduits={dialogProduits}
      dialogArticles={dialogArticles}
    />
  );
}
