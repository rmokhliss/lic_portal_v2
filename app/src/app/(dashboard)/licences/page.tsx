// ==============================================================================
// LIC v2 — /licences (T-03 — page liste globale cross-clients)
//
// Server Component. Filtres GET (statut + q recherche reference) + cursor
// pagination. Le client (raisonSociale) est résolu en post-fetch via N appels
// getClientUseCase parallèles (max 50 par page) — pas de JOIN ajouté côté repo
// pour limiter le scope T-03 (extension `q` uniquement).
// ==============================================================================

import Link from "next/link";

import { requireAuthPage } from "@/server/infrastructure/auth";
import { getClientUseCase, listAllLicencesUseCase } from "@/server/composition-root";

interface LicencesPageProps {
  readonly searchParams: Promise<{
    readonly cursor?: string;
    /** `statut=ACTIF | INACTIF | SUSPENDU | EXPIRE` (cohérent /clients). */
    readonly statut?: string;
    /** Recherche sous-chaîne sur reference (ILIKE). */
    readonly q?: string;
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIF: "Active",
  INACTIF: "Inactive",
  SUSPENDU: "Suspendue",
  EXPIRE: "Expirée",
};

const VALID_STATUSES = new Set(["ACTIF", "INACTIF", "SUSPENDU", "EXPIRE"]);

type LicenceStatusFilter = "ACTIF" | "INACTIF" | "SUSPENDU" | "EXPIRE";

export default async function LicencesPage({
  searchParams,
}: LicencesPageProps): Promise<React.JSX.Element> {
  await requireAuthPage();
  const params = await searchParams;

  const statusFilter: LicenceStatusFilter | undefined =
    params.statut !== undefined && VALID_STATUSES.has(params.statut)
      ? (params.statut as LicenceStatusFilter)
      : undefined;
  const qFilter = params.q !== undefined && params.q.trim().length > 0 ? params.q.trim() : "";

  const result = await listAllLicencesUseCase.execute({
    ...(params.cursor !== undefined ? { cursor: params.cursor } : {}),
    ...(statusFilter !== undefined ? { status: statusFilter } : {}),
    ...(qFilter.length > 0 ? { q: qFilter } : {}),
    limit: 25,
  });

  // Résolution clients en parallèle pour la colonne Client.
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
      <header>
        <h1 className="font-display text-foreground text-2xl">Licences</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vue cross-clients. {result.items.length} licence(s) sur la page courante.
        </p>
      </header>

      {/* Filtres */}
      <form
        method="GET"
        action="/licences"
        className="border-spx-ink/10 flex flex-wrap items-end gap-3 rounded-md border bg-white p-3"
      >
        <div className="flex min-w-[260px] flex-1 flex-col gap-1">
          <label htmlFor="q" className="text-spx-ink/60 text-xs uppercase tracking-wider">
            Référence
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="LIC-2026-..."
            defaultValue={qFilter}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="statut" className="text-spx-ink/60 text-xs uppercase tracking-wider">
            Statut
          </label>
          <select
            id="statut"
            name="statut"
            defaultValue={statusFilter ?? ""}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
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
          className="border-input h-9 rounded-md border px-3 text-sm leading-9"
        >
          Réinitialiser
        </Link>
      </form>

      <div className="border-spx-ink/10 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-spx-ink/5 text-spx-ink/70">
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
                <tr key={l.id} className="border-spx-ink/10 border-t">
                  <td className="px-4 py-2 font-mono">{l.reference}</td>
                  <td className="px-4 py-2">
                    {c === undefined ? (
                      <span className="text-spx-ink/40">—</span>
                    ) : (
                      <Link
                        href={`/clients/${c.id}/info`}
                        className="text-spx-blue-600 underline-offset-2 hover:underline"
                      >
                        {c.codeClient} · {c.raisonSociale}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2">{STATUS_LABEL[l.status] ?? l.status}</td>
                  <td className="px-4 py-2">{new Date(l.dateDebut).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-2">{new Date(l.dateFin).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/licences/${l.id}/resume`}
                      className="text-spx-blue-600 underline-offset-2 hover:underline"
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-spx-ink/60 px-4 py-6 text-center">
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
            className="border-spx-ink/20 hover:bg-spx-ink/5 rounded border px-3 py-1 text-sm"
          >
            ← Première page
          </Link>
        )}
        {result.nextCursor !== null && (
          <Link
            href={buildHref(result.nextCursor)}
            className="border-spx-ink/20 hover:bg-spx-ink/5 rounded border px-3 py-1 text-sm"
          >
            Suivant →
          </Link>
        )}
      </nav>
    </div>
  );
}
