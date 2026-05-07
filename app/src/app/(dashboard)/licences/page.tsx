// ==============================================================================
// LIC v2 — /licences (T-03 + Phase 18 R-11/R-12)
//
// Server Component. Filtres GET (statut + q recherche reference) + cursor
// pagination. Le client (raisonSociale) est résolu en post-fetch via N appels
// getClientUseCase parallèles (max 50 par page).
//
// Phase 18 R-11 — palette migrée sur les vars DS (`bg-card` / `bg-surface-2` /
// `text-foreground` / `border-border`) au lieu de `bg-white text-spx-ink`.
// L'ancienne palette legacy donnait du blanc sur blanc en mode dark.
//
// Phase 18 R-12 — bouton « + Nouvelle licence » (ADMIN/SADMIN). La création
// est gardée côté Server Action createLicenceAction (cf. _actions.ts).
// ==============================================================================

import Link from "next/link";

import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getClientUseCase,
  listAllLicencesUseCase,
  listArticlesUseCase,
  listClientsUseCase,
  listProduitsUseCase,
} from "@/server/composition-root";

import { NewLicenceDialog } from "./_components/NewLicenceDialog";

interface LicencesPageProps {
  readonly searchParams: Promise<{
    readonly cursor?: string;
    readonly statut?: string;
    readonly q?: string;
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIF: "Active",
  INACTIF: "Inactive",
  SUSPENDU: "Suspendue",
  EXPIRE: "Expirée",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIF: "bg-emerald-500/15 text-emerald-300",
  INACTIF: "bg-zinc-500/15 text-zinc-400",
  SUSPENDU: "bg-amber-500/15 text-amber-300",
  EXPIRE: "bg-rose-500/15 text-rose-300",
};

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

  // Phase 21 R-30 — wizard de création licence : pré-charge le catalogue
  // (produits + articles actifs) en parallèle. Volume cible <50 produits et
  // <500 articles, donc pas de pagination — le filtrage est client-side dans
  // le wizard.
  const [result, clientsList, produitsAll, articlesAll] = await Promise.all([
    listAllLicencesUseCase.execute({
      ...(params.cursor !== undefined ? { cursor: params.cursor } : {}),
      ...(statusFilter !== undefined ? { status: statusFilter } : {}),
      ...(qFilter.length > 0 ? { q: qFilter } : {}),
      limit: 25,
    }),
    listClientsUseCase.execute({ limit: 200 }),
    listProduitsUseCase.execute({ actif: true }),
    listArticlesUseCase.execute({ actif: true }),
  ]);

  // Résolution clients en parallèle pour la colonne Client de la table.
  const uniqueClientIds = Array.from(new Set(result.items.map((l) => l.clientId)));
  const clientsArr = await Promise.all(
    uniqueClientIds.map(async (id) => {
      try {
        return await getClientUseCase.execute(id);
      } catch {
        return null;
      }
    }),
  );
  const clientsById = new Map(clientsArr.flatMap((c) => (c === null ? [] : [[c.id, c] as const])));

  // Phase 18 R-12 — clients pour le combobox du wizard de création.
  const dialogClients = clientsList.items.map((c) => ({
    id: c.id,
    codeClient: c.codeClient,
    raisonSociale: c.raisonSociale,
  }));

  // Phase 21 R-30 — catalogue pour l'étape 2 du wizard (produits + articles
  // actifs uniquement, structure plate aplatissable côté client).
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

  const buildHref = (cursor: string | null): string => {
    const sp = new URLSearchParams();
    if (cursor !== null) sp.set("cursor", cursor);
    if (statusFilter !== undefined) sp.set("statut", statusFilter);
    if (qFilter.length > 0) sp.set("q", qFilter);
    const qs = sp.toString();
    return qs.length === 0 ? "/licences" : `/licences?${qs}`;
  };

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-2xl">Licences</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Vue cross-clients. {result.items.length} licence(s) sur la page courante.
          </p>
        </div>
        {canCreate && (
          <NewLicenceDialog
            clients={dialogClients}
            produits={dialogProduits}
            articles={dialogArticles}
          />
        )}
      </header>

      <form
        method="GET"
        action="/licences"
        className="border-border bg-card flex flex-wrap items-end gap-3 rounded-md border p-3"
      >
        <div className="flex min-w-[260px] flex-1 flex-col gap-1">
          <label htmlFor="q" className="text-muted-foreground text-xs uppercase tracking-wider">
            Référence
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="LIC-2026-..."
            defaultValue={qFilter}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="statut"
            className="text-muted-foreground text-xs uppercase tracking-wider"
          >
            Statut
          </label>
          <select
            id="statut"
            name="statut"
            defaultValue={statusFilter ?? ""}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Tous</option>
            <option value="ACTIF">Active</option>
            <option value="INACTIF">Inactive</option>
            <option value="SUSPENDU">Suspendue</option>
            <option value="EXPIRE">Expirée</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-9 rounded-md px-3 text-sm"
        >
          Filtrer
        </button>
        <Link
          href="/licences"
          className="border-input text-foreground h-9 rounded-md border px-3 text-sm leading-9"
        >
          Réinitialiser
        </Link>
      </form>

      <div className="border-border bg-card overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Référence</th>
              <th className="px-4 py-2 text-left font-medium">Client</th>
              <th className="px-4 py-2 text-left font-medium">Statut</th>
              <th className="px-4 py-2 text-left font-medium">Date début</th>
              <th className="px-4 py-2 text-left font-medium">Date fin</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((l) => {
              const c = clientsById.get(l.clientId);
              return (
                <tr key={l.id} className="border-border border-t">
                  <td className="px-4 py-2 font-mono">{l.reference}</td>
                  <td className="px-4 py-2">
                    {c === undefined ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Link
                        href={`/clients/${c.id}/info`}
                        className="text-spx-cyan-500 underline-offset-2 hover:underline"
                      >
                        {c.codeClient} · {c.raisonSociale}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_BADGE[l.status] ?? ""}`}>
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{new Date(l.dateDebut).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-2">{new Date(l.dateFin).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/licences/${l.id}/resume`}
                      className="text-spx-cyan-500 underline-offset-2 hover:underline"
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-6 text-center">
                  Aucune licence.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-end gap-2">
        {params.cursor !== undefined && (
          <Link
            href={buildHref(null)}
            className="border-border hover:bg-surface-2 rounded border px-3 py-1 text-sm"
          >
            ← Première page
          </Link>
        )}
        {result.nextCursor !== null && (
          <Link
            href={buildHref(result.nextCursor)}
            className="border-border hover:bg-surface-2 rounded border px-3 py-1 text-sm"
          >
            Suivant →
          </Link>
        )}
      </nav>
    </div>
  );
}
