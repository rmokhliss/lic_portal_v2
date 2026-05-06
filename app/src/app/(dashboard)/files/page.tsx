// ==============================================================================
// LIC v2 — /files (Phase 17 S2)
//
// Vue cross-licence des fichiers .lic générés et healthchecks importés.
// Server Component, requireRolePage(["ADMIN", "SADMIN"]). Filtres GET :
// type / statut / période. MVP sans cursor (volume démo faible).
// ==============================================================================

import Link from "next/link";

import { requireRolePage } from "@/server/infrastructure/auth";
import {
  getClientUseCase,
  getLicenceUseCase,
  listAllFichiersUseCase,
} from "@/server/composition-root";

interface FilesPageProps {
  readonly searchParams: Promise<{
    readonly type?: string;
    readonly statut?: string;
    readonly since?: string;
    readonly until?: string;
  }>;
}

const VALID_TYPES = new Set(["LIC_GENERATED", "HEALTHCHECK_IMPORTED"]);
const VALID_STATUTS = new Set(["GENERATED", "IMPORTED", "ERREUR"]);

const TYPE_LABEL: Record<string, string> = {
  LIC_GENERATED: "Fichier .lic généré",
  HEALTHCHECK_IMPORTED: "Healthcheck importé",
};

const STATUT_BADGE: Record<string, string> = {
  GENERATED: "bg-spx-cyan-500/15 text-spx-cyan-100",
  IMPORTED: "bg-emerald-500/15 text-emerald-300",
  ERREUR: "bg-rose-500/15 text-rose-300",
};

export default async function FilesPage({
  searchParams,
}: FilesPageProps): Promise<React.JSX.Element> {
  await requireRolePage(["ADMIN", "SADMIN"]);
  const params = await searchParams;

  const typeFilter =
    params.type !== undefined && VALID_TYPES.has(params.type) ? params.type : undefined;
  const statutFilter =
    params.statut !== undefined && VALID_STATUTS.has(params.statut) ? params.statut : undefined;
  const since = parseDate(params.since);
  const until = parseDate(params.until);

  const fichiers = await listAllFichiersUseCase.execute({
    ...(typeFilter !== undefined
      ? { type: typeFilter as "LIC_GENERATED" | "HEALTHCHECK_IMPORTED" }
      : {}),
    ...(statutFilter !== undefined
      ? { statut: statutFilter as "GENERATED" | "IMPORTED" | "ERREUR" }
      : {}),
    ...(since !== undefined ? { since } : {}),
    ...(until !== undefined ? { until } : {}),
    limit: 200,
  });

  // Résolution licence + client en parallèle pour les colonnes Référence + Client.
  const uniqueLicenceIds = Array.from(new Set(fichiers.map((f) => f.licenceId)));
  const licencesArr = await Promise.all(
    uniqueLicenceIds.map(async (id) => {
      try {
        return await getLicenceUseCase.execute(id);
      } catch {
        return null;
      }
    }),
  );
  const licencesById = new Map(
    licencesArr.flatMap((l) => (l === null ? [] : [[l.id, l] as const])),
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

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="font-display text-foreground text-2xl">Fichiers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Journal global des fichiers <code className="bg-muted rounded px-1">.lic</code> générés et
          healthchecks importés. {fichiers.length} entrée(s) affichée(s) (max 200).
        </p>
      </header>

      <form
        method="GET"
        action="/files"
        className="border-border bg-surface-1 flex flex-wrap items-end gap-3 rounded-md border p-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-muted-foreground text-xs uppercase tracking-wider">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={typeFilter ?? ""}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Tous</option>
            <option value="LIC_GENERATED">Fichier .lic</option>
            <option value="HEALTHCHECK_IMPORTED">Healthcheck</option>
          </select>
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
            defaultValue={statutFilter ?? ""}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Tous</option>
            <option value="GENERATED">Généré</option>
            <option value="IMPORTED">Importé</option>
            <option value="ERREUR">Erreur</option>
          </select>
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
        <Link href="/files" className="border-input h-9 rounded-md border px-3 text-sm leading-9">
          Réinitialiser
        </Link>
      </form>

      <div className="border-border bg-surface-1 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Licence</th>
              <th className="px-4 py-2 text-left font-medium">Client</th>
              <th className="px-4 py-2 text-left font-medium">Statut</th>
              <th className="px-4 py-2 text-left font-medium">Hash SHA-256</th>
            </tr>
          </thead>
          <tbody>
            {fichiers.map((f) => {
              const licence = licencesById.get(f.licenceId);
              const client = licence !== undefined ? clientsById.get(licence.clientId) : undefined;
              const hashShort = f.hash.length >= 16 ? `${f.hash.slice(0, 16)}…` : f.hash;
              return (
                <tr key={f.id} className="border-border border-t">
                  <td className="px-4 py-2 font-mono text-xs">
                    {new Date(f.createdAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2">{TYPE_LABEL[f.type] ?? f.type}</td>
                  <td className="px-4 py-2 font-mono">
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
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUT_BADGE[f.statut] ?? ""}`}>
                      {f.statut}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs" title={f.hash}>
                    {hashShort}
                  </td>
                </tr>
              );
            })}
            {fichiers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-6 text-center">
                  Aucun fichier journalisé pour les filtres sélectionnés.
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
