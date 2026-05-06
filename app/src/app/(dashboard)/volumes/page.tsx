// ==============================================================================
// LIC v2 — /volumes (Phase 17 S3)
//
// Vue cross-clients du suivi des volumes consommés (snapshots mensuels
// volume_history). Server Component, requireAuthPage(). Filtres GET :
// clientId, articleId, since, until. MVP : fetch limit 500 + filtrage
// in-page (pas de filtre client au niveau repo — volume démo faible).
// ==============================================================================

import Link from "next/link";

import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getArticleUseCase,
  getClientUseCase,
  getLicenceUseCase,
  listClientsUseCase,
  listVolumeHistoryUseCase,
} from "@/server/composition-root";

interface VolumesPageProps {
  readonly searchParams: Promise<{
    readonly clientId?: string;
    readonly articleCode?: string;
    readonly since?: string;
    readonly until?: string;
  }>;
}

export default async function VolumesPage({
  searchParams,
}: VolumesPageProps): Promise<React.JSX.Element> {
  await requireAuthPage();
  const params = await searchParams;
  const clientFilter =
    params.clientId !== undefined && params.clientId.length > 0 ? params.clientId : undefined;
  const articleCodeFilter =
    params.articleCode !== undefined && params.articleCode.length > 0
      ? params.articleCode
      : undefined;
  const since = parseDate(params.since);
  const until = parseDate(params.until);

  // Volume démo faible — on tire 500 snapshots récents puis on filtre en page.
  const all = await listVolumeHistoryUseCase.execute({ limit: 500 });

  // Filtrer par période (sur `periode` YYYY-MM-DD) si fourni.
  const filteredByPeriod = all.items.filter((s) => {
    const periode = new Date(s.periode);
    if (since !== undefined && periode < since) return false;
    if (until !== undefined && periode > until) return false;
    return true;
  });

  // Résolution licence + article + client en parallèle.
  const uniqueLicenceIds = Array.from(new Set(filteredByPeriod.map((s) => s.licenceId)));
  const uniqueArticleIds = Array.from(new Set(filteredByPeriod.map((s) => s.articleId)));

  const [licencesArr, articlesArr] = await Promise.all([
    Promise.all(
      uniqueLicenceIds.map(async (id) => {
        try {
          return await getLicenceUseCase.execute(id);
        } catch {
          return null;
        }
      }),
    ),
    Promise.all(
      uniqueArticleIds.map(async (id) => {
        try {
          return await getArticleUseCase.execute(id);
        } catch {
          return null;
        }
      }),
    ),
  ]);

  const licencesById = new Map(
    licencesArr.flatMap((l) => (l === null ? [] : [[l.id, l] as const])),
  );
  const articlesById = new Map(
    articlesArr.flatMap((a) => (a === null ? [] : [[a.id, a] as const])),
  );

  const uniqueClientIds = Array.from(
    new Set(licencesArr.flatMap((l) => (l === null ? [] : [l.clientId]))),
  );
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

  // Filtre final post-resolution : client + article code.
  const rows = filteredByPeriod
    .filter((s) => {
      const licence = licencesById.get(s.licenceId);
      const article = articlesById.get(s.articleId);
      if (clientFilter !== undefined && licence?.clientId !== clientFilter) return false;
      if (articleCodeFilter !== undefined && article?.code !== articleCodeFilter) return false;
      return true;
    })
    .map((s) => {
      const licence = licencesById.get(s.licenceId);
      const article = articlesById.get(s.articleId);
      const client = licence !== undefined ? clientsById.get(licence.clientId) : undefined;
      return { snapshot: s, licence, article, client };
    });

  // Pour le selecteur client : tous les clients seedés.
  const clientsList = await listClientsUseCase.execute({ limit: 200 });

  // Liste de codes article distincts pour datalist.
  const distinctArticleCodes = Array.from(
    new Set(articlesArr.flatMap((a) => (a === null ? [] : [a.code]))),
  ).sort();

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="font-display text-foreground text-2xl">Articles &amp; Volumes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Suivi des volumes consommés par article × licence (snapshots mensuels). {rows.length}{" "}
          ligne(s) affichée(s).
        </p>
      </header>

      <form
        method="GET"
        action="/volumes"
        className="border-border bg-surface-1 flex flex-wrap items-end gap-3 rounded-md border p-3"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="clientId"
            className="text-muted-foreground text-xs uppercase tracking-wider"
          >
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={clientFilter ?? ""}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Tous</option>
            {clientsList.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codeClient} · {c.raisonSociale}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="articleCode"
            className="text-muted-foreground text-xs uppercase tracking-wider"
          >
            Article (code)
          </label>
          <input
            id="articleCode"
            name="articleCode"
            list="articleCodes"
            defaultValue={articleCodeFilter ?? ""}
            placeholder="ex: KERNEL"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
          <datalist id="articleCodes">
            {distinctArticleCodes.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="since" className="text-muted-foreground text-xs uppercase tracking-wider">
            Depuis
          </label>
          <input
            id="since"
            name="since"
            type="date"
            defaultValue={params.since ?? ""}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="until" className="text-muted-foreground text-xs uppercase tracking-wider">
            Jusqu&apos;au
          </label>
          <input
            id="until"
            name="until"
            type="date"
            defaultValue={params.until ?? ""}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-9 rounded-md px-3 text-sm"
        >
          Filtrer
        </button>
        <Link href="/volumes" className="border-input h-9 rounded-md border px-3 text-sm leading-9">
          Réinitialiser
        </Link>
      </form>

      <div className="border-border bg-surface-1 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Période</th>
              <th className="px-4 py-2 text-left font-medium">Client</th>
              <th className="px-4 py-2 text-left font-medium">Licence</th>
              <th className="px-4 py-2 text-left font-medium">Article</th>
              <th className="px-4 py-2 text-right font-medium">Vol. autorisé</th>
              <th className="px-4 py-2 text-right font-medium">Vol. consommé</th>
              <th className="px-4 py-2 text-right font-medium">Taux</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const taux =
                row.snapshot.volumeAutorise > 0
                  ? Math.round((row.snapshot.volumeConsomme / row.snapshot.volumeAutorise) * 100)
                  : 0;
              const tauxClass =
                taux >= 100 ? "text-rose-400" : taux >= 80 ? "text-amber-400" : "text-emerald-400";
              return (
                <tr key={row.snapshot.id} className="border-border border-t">
                  <td className="px-4 py-2 font-mono text-xs">{row.snapshot.periode}</td>
                  <td className="px-4 py-2">
                    {row.client === undefined ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Link
                        href={`/clients/${row.client.id}/info`}
                        className="text-spx-cyan-500 hover:underline"
                      >
                        {row.client.codeClient}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono">
                    {row.licence === undefined ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Link
                        href={`/licences/${row.licence.id}/resume`}
                        className="text-spx-cyan-500 hover:underline"
                      >
                        {row.licence.reference}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono">
                    {row.article === undefined ? "—" : row.article.code}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {row.snapshot.volumeAutorise.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {row.snapshot.volumeConsomme.toLocaleString("fr-FR")}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono ${tauxClass}`}>{taux}%</td>
                  <td className="px-4 py-2 text-right">
                    {row.licence === undefined ? null : (
                      <Link
                        href={`/licences/${row.licence.id}/articles`}
                        className="text-spx-cyan-500 text-xs hover:underline"
                      >
                        Modifier
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-muted-foreground px-4 py-6 text-center">
                  Aucun snapshot pour les filtres sélectionnés.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function parseDate(s: string | undefined): Date | undefined {
  if (s === undefined || s.trim().length === 0) return undefined;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : undefined;
}
