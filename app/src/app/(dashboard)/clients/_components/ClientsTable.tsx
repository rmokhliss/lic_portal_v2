// ==============================================================================
// LIC v2 — ClientsTable (Phase 4 étape 4.E)
//
// Client Component table + filtres + pagination cursor.
//
// Filtres soumis via <form method="GET"> qui mute searchParams (Next.js
// re-render Server Component parent → re-fetch listClientsUseCase). Approche
// SSR-friendly, pas d'état client local pour les filtres.
//
// Pagination cursor :
//   - "Suivant" → <Link href="?cursor=<nextCursor>&q=...&statut=..."> (forward)
//   - "Précédent" → router.back() — l'URL Next.js stocke chaque page = histo
//                  natif fonctionne. Pas de cursor stack URL nécessaire.
//   - "Première page" → reset cursor (?q=&statut= conservés)
//
// "Nouveau client" affiché uniquement si canCreate (ADMIN/SADMIN).
// ==============================================================================

"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ClientDialog, type RefItem } from "./ClientDialog";
import { ClientStatusBadge } from "./ClientStatusBadge";
import type { ClientDTO, ClientStatutClient } from "./clients-types";

const STATUTS: readonly ClientStatutClient[] = ["PROSPECT", "ACTIF", "SUSPENDU", "RESILIE"];

export interface ClientsTableProps {
  readonly rows: readonly ClientDTO[];
  readonly nextCursor: string | null;
  readonly currentCursor: string | null;
  readonly currentQuery: string;
  readonly currentStatut: ClientStatutClient | null;
  /** Phase 20 R-29 — filtres enrichis. Strings non-vides, "" = pas de filtre. */
  readonly currentPays: string;
  readonly currentAm: string;
  readonly currentSales: string;
  /** Phase 21 R-29 — région + sansLicence. */
  readonly currentRegion: string;
  readonly currentSansLicence: boolean;
  readonly regionsList: readonly RefItem[];
  /** Phase 20 R-29 — total clients matchant les filtres (hors pagination). */
  readonly total: number;
  readonly canCreate: boolean;
  /** T-01 : référentiels SADMIN propagés au ClientDialog. */
  readonly paysList: readonly RefItem[];
  readonly devisesList: readonly RefItem[];
  readonly languesList: readonly RefItem[];
  /** T-01 Volet A : team-members SALES / AM pour selects salesResponsable / accountManager. */
  readonly salesList: readonly RefItem[];
  readonly amList: readonly RefItem[];
  /** Phase 14 — DETTE-LIC-017 : types contact pour la section contacts à création. */
  readonly typesContactList?: readonly RefItem[];
}

type DialogState = { kind: "none" } | { kind: "create" } | { kind: "edit"; client: ClientDTO };

export function ClientsTable(props: ClientsTableProps) {
  const t = useTranslations("clients");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  // Phase 18 R-07 — Dialog lecture seule (icône Eye) séparé du Dialog
  // édition. Permet une consultation rapide sans naviguer vers /clients/[id].
  const [viewClient, setViewClient] = useState<ClientDTO | null>(null);

  // Phase 18 R-06 — Map code → nom pays pour afficher 'Maroc' au lieu de 'MA'.
  // Les autres référentiels (devise/langue) suivent le même pattern.
  const paysByCode = useMemo(
    () => new Map(props.paysList.map((p) => [p.code, p.label])),
    [props.paysList],
  );
  const deviseByCode = useMemo(
    () => new Map(props.devisesList.map((d) => [d.code, d.label])),
    [props.devisesList],
  );
  const langueByCode = useMemo(
    () => new Map(props.languesList.map((l) => [l.code, l.label])),
    [props.languesList],
  );

  const buildHref = (cursor: string | null): string => {
    const sp = new URLSearchParams();
    if (cursor !== null) sp.set("cursor", cursor);
    if (props.currentQuery !== "") sp.set("q", props.currentQuery);
    if (props.currentStatut !== null) sp.set("statut", props.currentStatut);
    // Phase 20 R-29 — préserver les filtres enrichis lors de la pagination.
    if (props.currentPays !== "") sp.set("pays", props.currentPays);
    if (props.currentAm !== "") sp.set("am", props.currentAm);
    if (props.currentSales !== "") sp.set("sales", props.currentSales);
    // Phase 21 R-29 — région + sansLicence.
    if (props.currentRegion !== "") sp.set("region", props.currentRegion);
    if (props.currentSansLicence) sp.set("sansLicence", "1");
    const qs = sp.toString();
    return qs.length === 0 ? "/clients" : `/clients?${qs}`;
  };

  const onPrevious = () => {
    // Browser history naturel : chaque page = URL distincte → back() = page précédente.
    router.back();
  };

  const isFirstPage = props.currentCursor === null;
  const hasNext = props.nextCursor !== null;

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-2xl">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("subtitle")}
            {/* Phase 20 R-29 — total au-dessus du tableau. */}
            <span className="text-foreground ml-2 font-mono">
              · {props.total} client(s) au total
            </span>
          </p>
        </div>
        {props.canCreate && (
          <Button
            onClick={() => {
              setDialog({ kind: "create" });
            }}
          >
            {t("actions.new")}
          </Button>
        )}
      </header>

      {/* Filtres (form GET → mute URL searchParams) */}
      <form
        method="GET"
        action="/clients"
        className="bg-card border-border mb-6 flex flex-wrap items-end gap-3 rounded-md border p-3"
      >
        <div className="flex min-w-[280px] flex-1 flex-col gap-1">
          <label htmlFor="q" className="text-muted-foreground text-xs uppercase tracking-wider">
            {t("filters.search")}
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            placeholder={t("filters.searchPlaceholder")}
            defaultValue={props.currentQuery}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="statut"
            className="text-muted-foreground text-xs uppercase tracking-wider"
          >
            {t("table.statut")}
          </label>
          <select
            id="statut"
            name="statut"
            defaultValue={props.currentStatut ?? ""}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">{t("filters.statutAll")}</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {t(`statut.${s}`)}
              </option>
            ))}
          </select>
        </div>
        {/* Phase 20 R-29 — filtres enrichis pays / AM / Sales. */}
        <div className="flex flex-col gap-1">
          <label htmlFor="pays" className="text-muted-foreground text-xs uppercase tracking-wider">
            Pays
          </label>
          <select
            id="pays"
            name="pays"
            defaultValue={props.currentPays}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Tous</option>
            {props.paysList.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="am" className="text-muted-foreground text-xs uppercase tracking-wider">
            Account Manager
          </label>
          <select
            id="am"
            name="am"
            defaultValue={props.currentAm}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Tous</option>
            {props.amList.map((m) => (
              <option key={m.code} value={m.code}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sales" className="text-muted-foreground text-xs uppercase tracking-wider">
            Sales
          </label>
          <select
            id="sales"
            name="sales"
            defaultValue={props.currentSales}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Tous</option>
            {props.salesList.map((m) => (
              <option key={m.code} value={m.code}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {/* Phase 21 R-29 — Région (sub-query lic_pays_ref) */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="region"
            className="text-muted-foreground text-xs uppercase tracking-wider"
          >
            Région
          </label>
          <select
            id="region"
            name="region"
            defaultValue={props.currentRegion}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Toutes</option>
            {props.regionsList.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {/* Phase 21 R-29 — checkbox 'Sans licence active' (NOT EXISTS sub-query) */}
        <div className="flex items-end gap-2 pb-1">
          <input
            id="sansLicence"
            name="sansLicence"
            type="checkbox"
            value="1"
            defaultChecked={props.currentSansLicence}
            className="size-4"
          />
          <label htmlFor="sansLicence" className="text-foreground text-sm">
            Sans licence active
          </label>
        </div>
        <Button type="submit" variant="default">
          {t("filters.apply")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/clients">{t("filters.reset")}</Link>
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.codeClient")}</TableHead>
            <TableHead>{t("table.raisonSociale")}</TableHead>
            <TableHead>{t("table.pays")}</TableHead>
            <TableHead>{t("table.statut")}</TableHead>
            <TableHead>{t("table.dateCreation")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            props.rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.codeClient}</TableCell>
                <TableCell className="font-medium">{c.raisonSociale}</TableCell>
                <TableCell className="text-sm">
                  {c.codePays === null ? "—" : (paysByCode.get(c.codePays) ?? c.codePays)}
                </TableCell>
                <TableCell>
                  <ClientStatusBadge statut={c.statutClient} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {c.dateCreation.slice(0, 10)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Voir détail rapide"
                      title="Voir détail rapide"
                      onClick={() => {
                        setViewClient(c);
                      }}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                    </Button>
                    {props.canCreate && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDialog({ kind: "edit", client: c });
                        }}
                      >
                        {t("actions.edit")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <nav className="mt-4 flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onPrevious} disabled={isFirstPage}>
          ← {t("pagination.previous")}
        </Button>
        <div className="flex items-center gap-2">
          {!isFirstPage && (
            <Button type="button" variant="outline" asChild>
              <Link href={buildHref(null)}>{t("pagination.first")}</Link>
            </Button>
          )}
          <Button
            type="button"
            variant={hasNext ? "default" : "outline"}
            disabled={!hasNext}
            asChild={hasNext}
          >
            {hasNext ? (
              <Link href={buildHref(props.nextCursor)}>{t("pagination.next")} →</Link>
            ) : (
              <span>{t("pagination.next")} →</span>
            )}
          </Button>
        </div>
      </nav>

      {/* Dialog création/édition */}
      <ClientDialog
        open={dialog.kind === "create" || dialog.kind === "edit"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        mode={dialog.kind === "edit" ? "edit" : "create"}
        client={dialog.kind === "edit" ? dialog.client : undefined}
        paysList={props.paysList}
        devisesList={props.devisesList}
        languesList={props.languesList}
        salesList={props.salesList}
        amList={props.amList}
        typesContactList={props.typesContactList}
      />

      {/* Phase 18 R-07 — Dialog lecture seule (Eye) — affiche les infos
          déjà présentes dans le DTO. Pour le détail complet (entités,
          licences, contacts), un lien renvoie vers /clients/[id]/info. */}
      <Dialog
        open={viewClient !== null}
        onOpenChange={(open) => {
          if (!open) setViewClient(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewClient === null
                ? "Détail client"
                : `${viewClient.codeClient} · ${viewClient.raisonSociale}`}
            </DialogTitle>
          </DialogHeader>
          {viewClient !== null && (
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <dt className="text-muted-foreground">Code</dt>
              <dd className="col-span-2 font-mono">{viewClient.codeClient}</dd>
              <dt className="text-muted-foreground">Raison sociale</dt>
              <dd className="col-span-2">{viewClient.raisonSociale}</dd>
              <dt className="text-muted-foreground">Pays</dt>
              <dd className="col-span-2">
                {viewClient.codePays === null
                  ? "—"
                  : (paysByCode.get(viewClient.codePays) ?? viewClient.codePays)}
              </dd>
              <dt className="text-muted-foreground">Devise</dt>
              <dd className="col-span-2">
                {viewClient.codeDevise === null
                  ? "—"
                  : (deviseByCode.get(viewClient.codeDevise) ?? viewClient.codeDevise)}
              </dd>
              <dt className="text-muted-foreground">Langue</dt>
              <dd className="col-span-2">
                {viewClient.codeLangue === null
                  ? "—"
                  : (langueByCode.get(viewClient.codeLangue) ?? viewClient.codeLangue)}
              </dd>
              <dt className="text-muted-foreground">Statut</dt>
              <dd className="col-span-2">
                <ClientStatusBadge statut={viewClient.statutClient} />
              </dd>
              <dt className="text-muted-foreground">Sales</dt>
              <dd className="col-span-2">{viewClient.salesResponsable ?? "—"}</dd>
              <dt className="text-muted-foreground">Account Manager</dt>
              <dd className="col-span-2">{viewClient.accountManager ?? "—"}</dd>
              <dt className="text-muted-foreground">Date création</dt>
              <dd className="col-span-2 text-xs">{viewClient.dateCreation.slice(0, 10)}</dd>
            </dl>
          )}
          <DialogFooter>
            {viewClient !== null && (
              <Button asChild variant="outline">
                <Link href={`/clients/${viewClient.id}/info`}>Voir détail complet →</Link>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setViewClient(null);
              }}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Indicateur silencieux pour réutiliser searchParams (évite warning lint) */}
      <span hidden>{searchParams.toString()}</span>
    </div>
  );
}
