// ==============================================================================
// LIC v2 — LicencesTable (Client Component, Phase 24)
//
// Wrap page-level / table / filtres / pagination / wizard dans UN seul Client
// Component. Aligne le pattern sur /clients (ClientsTable) — c'est ce wrapping
// qui permet à l'auto-refresh post Server Action de re-render le composant
// avec les nouvelles props sans hack router.refresh.
//
// Pourquoi ce wrap : le Server Component parent (page.tsx) re-fetch les data
// via revalidatePath/auto-refresh, passe les nouvelles props ICI, React
// reconcilie ce Client Component avec les nouveaux items → la table montre la
// nouvelle ligne. Inline (table en JSX directement dans le SC) ça marchait pas
// fiablement à cause du portail Radix qui interférait avec la reconciliation.
// ==============================================================================

"use client";

import Link from "next/link";

import {
  NewLicenceDialog,
  type ArticleOption,
  type ClientOption,
  type ProduitOption,
} from "./NewLicenceDialog";

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

export interface LicenceRow {
  readonly id: string;
  readonly reference: string;
  readonly clientId: string;
  readonly entiteId: string;
  readonly status: "ACTIF" | "INACTIF" | "SUSPENDU" | "EXPIRE";
  readonly dateDebut: string;
  readonly dateFin: string;
}

export interface ClientLite {
  readonly id: string;
  readonly codeClient: string;
  readonly raisonSociale: string;
}

export interface EntiteLite {
  readonly id: string;
  readonly nom: string;
}

export interface LicencesTableProps {
  readonly rows: readonly LicenceRow[];
  readonly nextCursor: string | null;
  readonly currentCursor: string | null;
  readonly currentQuery: string;
  readonly currentStatut: "ACTIF" | "INACTIF" | "SUSPENDU" | "EXPIRE" | null;
  readonly currentClientId: string | null;
  readonly clientsById: Readonly<Record<string, ClientLite>>;
  readonly entitesById: Readonly<Record<string, EntiteLite>>;
  readonly staleById: Readonly<Record<string, "never" | "fresh" | "stale">>;
  readonly staleCount: number;
  readonly canCreate: boolean;
  readonly dialogClients: readonly ClientOption[];
  readonly dialogProduits: readonly ProduitOption[];
  readonly dialogArticles: readonly ArticleOption[];
}

export function LicencesTable(props: LicencesTableProps): React.JSX.Element {
  const buildHref = (cursor: string | null): string => {
    const sp = new URLSearchParams();
    if (cursor !== null) sp.set("cursor", cursor);
    if (props.currentStatut !== null) sp.set("statut", props.currentStatut);
    if (props.currentQuery.length > 0) sp.set("q", props.currentQuery);
    if (props.currentClientId !== null) sp.set("clientId", props.currentClientId);
    const qs = sp.toString();
    return qs.length === 0 ? "/licences" : `/licences?${qs}`;
  };

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-2xl">Licences</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Vue cross-clients. {props.rows.length} licence(s) sur la page courante.
          </p>
        </div>
        {props.canCreate && (
          <NewLicenceDialog
            clients={props.dialogClients}
            produits={props.dialogProduits}
            articles={props.dialogArticles}
          />
        )}
      </header>

      {props.staleCount > 0 && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p className="font-medium">
            ⚠ {props.staleCount} licence(s) avec fichier .lic obsolète sur cette page
          </p>
          <p className="mt-1 text-xs">
            Articles ou volumes modifiés depuis la dernière génération. Les .lic correspondants
            doivent être régénérés.
          </p>
        </div>
      )}

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
            defaultValue={props.currentQuery}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="flex min-w-[200px] flex-col gap-1">
          <label
            htmlFor="clientId"
            className="text-muted-foreground text-xs uppercase tracking-wider"
          >
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={props.currentClientId ?? ""}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Tous</option>
            {props.dialogClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codeClient} · {c.raisonSociale}
              </option>
            ))}
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
            defaultValue={props.currentStatut ?? ""}
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
              <th className="px-4 py-2 text-left font-medium">Entité</th>
              <th className="px-4 py-2 text-left font-medium">Statut</th>
              <th className="px-4 py-2 text-left font-medium">.lic</th>
              <th className="px-4 py-2 text-left font-medium">Date début</th>
              <th className="px-4 py-2 text-left font-medium">Date fin</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((l) => {
              const c = props.clientsById[l.clientId];
              const e = props.entitesById[l.entiteId];
              const staleStatus = props.staleById[l.id] ?? "never";
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
                    {e === undefined ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-foreground">{e.nom}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_BADGE[l.status] ?? ""}`}>
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <LicFileBadge status={staleStatus} />
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
            {props.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-muted-foreground px-4 py-6 text-center">
                  Aucune licence.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-end gap-2">
        {props.currentCursor !== null && (
          <Link
            href={buildHref(null)}
            className="border-border hover:bg-surface-2 rounded border px-3 py-1 text-sm"
          >
            ← Première page
          </Link>
        )}
        {props.nextCursor !== null && (
          <Link
            href={buildHref(props.nextCursor)}
            className="border-border hover:bg-surface-2 rounded border px-3 py-1 text-sm"
          >
            Suivant →
          </Link>
        )}
      </nav>
    </div>
  );
}

function LicFileBadge({
  status,
}: {
  readonly status: "never" | "fresh" | "stale";
}): React.JSX.Element {
  if (status === "stale") {
    return (
      <span
        title="Articles ou volumes modifiés depuis la dernière génération — fichier .lic à régénérer."
        className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300"
      >
        Obsolète
      </span>
    );
  }
  if (status === "fresh") {
    return (
      <span
        title="Le fichier .lic généré reflète l'état courant de la licence."
        className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300"
      >
        À jour
      </span>
    );
  }
  return (
    <span
      title="Aucun fichier .lic n'a encore été généré pour cette licence."
      className="text-muted-foreground rounded bg-zinc-500/10 px-2 py-0.5 text-xs"
    >
      Jamais
    </span>
  );
}
