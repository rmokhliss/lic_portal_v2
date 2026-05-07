// ==============================================================================
// LIC v2 — /volumes (Phase 17 S3 + Phase 23 EC-04 tendance/projection)
//
// Vue cross-clients du suivi des volumes consommés. Server Component,
// requireAuthPage(). Filtres GET : clientId, articleCode.
//
// Phase 23 — refonte vers EC-04 : groupement par (licence × article) avec
// pour chaque ligne la dernière valeur, la tendance ↗↘→ (3 derniers points),
// la projection (date estimée de dépassement vs date_fin licence) et un
// sparkline 12 mois inline. Le repère métier devient « santé du couple
// licence×article » au lieu d'un tableau de snapshots bruts.
// ==============================================================================

import Link from "next/link";

import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getArticleUseCase,
  getClientUseCase,
  getLicenceUseCase,
  getVolumeTrendsUseCase,
  listClientsUseCase,
} from "@/server/composition-root";

import { VolumeSparkline } from "./_components/VolumeSparkline";

interface VolumesPageProps {
  readonly searchParams: Promise<{
    readonly clientId?: string;
    readonly articleCode?: string;
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

  const trends = await getVolumeTrendsUseCase.execute({ months: 12 });

  // Résolution licence + article + client en parallèle.
  const uniqueLicenceIds = Array.from(new Set(trends.map((t) => t.licenceId)));
  const uniqueArticleIds = Array.from(new Set(trends.map((t) => t.articleId)));

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
  const rows = trends
    .map((t) => {
      const licence = licencesById.get(t.licenceId);
      const article = articlesById.get(t.articleId);
      const client = licence !== undefined ? clientsById.get(licence.clientId) : undefined;
      return { trend: t, licence, article, client };
    })
    .filter((row) => {
      if (clientFilter !== undefined && row.licence?.clientId !== clientFilter) return false;
      if (articleCodeFilter !== undefined && row.article?.code !== articleCodeFilter) return false;
      return true;
    });

  // Pour le selecteur client : tous les clients seedés.
  const clientsList = await listClientsUseCase.execute({ limit: 200 });

  const distinctArticleCodes = Array.from(
    new Set(articlesArr.flatMap((a) => (a === null ? [] : [a.code]))),
  ).sort();

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="font-display text-foreground text-2xl">Articles &amp; Volumes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Suivi des volumes consommés par couple licence × article (tendance + projection sur 12
          derniers mois). {rows.length} ligne(s) affichée(s).
        </p>
      </header>

      <form
        method="GET"
        action="/volumes"
        className="border-border bg-card flex flex-wrap items-end gap-3 rounded-md border p-3"
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
            placeholder="ex: ATM-STD"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
          <datalist id="articleCodes">
            {distinctArticleCodes.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
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

      <div className="border-border bg-card overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Client</th>
              <th className="px-4 py-2 text-left font-medium">Licence</th>
              <th className="px-4 py-2 text-left font-medium">Article</th>
              <th className="px-4 py-2 text-right font-medium">Vol. autorisé</th>
              <th className="px-4 py-2 text-right font-medium">Vol. consommé</th>
              <th className="px-4 py-2 text-right font-medium">Taux</th>
              <th className="px-4 py-2 text-center font-medium">Tendance</th>
              <th className="px-4 py-2 text-left font-medium">Projection</th>
              <th className="px-4 py-2 text-center font-medium">12 mois</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { trend, licence, article, client } = row;
              const taux =
                trend.latest.volumeAutorise > 0
                  ? Math.round((trend.latest.volumeConsomme / trend.latest.volumeAutorise) * 100)
                  : 0;
              const tauxClass =
                taux >= 100 ? "text-destructive" : taux >= 80 ? "text-warning" : "text-success";
              return (
                <tr
                  key={`${trend.licenceId}-${String(trend.articleId)}`}
                  className="border-border border-t"
                >
                  <td className="px-4 py-2">
                    {client === undefined ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Link
                        href={`/clients/${client.id}/info`}
                        className="text-spx-cyan-500 hover:underline"
                      >
                        {client.codeClient}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {licence === undefined ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Link
                        href={`/licences/${licence.id}/resume`}
                        className="text-spx-cyan-500 hover:underline"
                      >
                        {licence.reference}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {article === undefined ? "—" : article.code}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {trend.latest.volumeAutorise.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {trend.latest.volumeConsomme.toLocaleString("fr-FR")}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono ${tauxClass}`}>{taux}%</td>
                  <td className="px-4 py-2 text-center text-base">
                    <TendanceBadge tendance={trend.tendance} />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <ProjectionLabel projection={trend.projection} />
                  </td>
                  <td className="px-4 py-2">
                    <VolumeSparkline points={trend.history} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {licence === undefined ? null : (
                      <Link
                        href={`/licences/${licence.id}/articles`}
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
                <td colSpan={10} className="text-muted-foreground px-4 py-6 text-center">
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

function TendanceBadge({ tendance }: { readonly tendance: "UP" | "DOWN" | "FLAT" }) {
  if (tendance === "UP") {
    return (
      <span title="Consommation en hausse" className="text-warning">
        ↗
      </span>
    );
  }
  if (tendance === "DOWN") {
    return (
      <span title="Consommation en baisse" className="text-success">
        ↘
      </span>
    );
  }
  return (
    <span title="Consommation stable" className="text-muted-foreground">
      →
    </span>
  );
}

function ProjectionLabel({
  projection,
}: {
  readonly projection: {
    readonly kind: "ON_TIME" | "TIGHT" | "EXCEEDED" | "NA";
    readonly estimatedExceedDate: string | null;
  };
}) {
  switch (projection.kind) {
    case "EXCEEDED":
      return <span className="text-destructive font-medium">Déjà dépassé</span>;
    case "TIGHT":
      return (
        <span className="text-warning">
          Calibrage{" "}
          {projection.estimatedExceedDate !== null && (
            <span className="text-muted-foreground font-mono">
              · ~{projection.estimatedExceedDate}
            </span>
          )}
        </span>
      );
    case "ON_TIME":
      return <span className="text-success">Dans les temps</span>;
    case "NA":
    default:
      return <span className="text-muted-foreground">—</span>;
  }
}
