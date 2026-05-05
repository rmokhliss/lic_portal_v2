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

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
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
  readonly canCreate: boolean;
  /** T-01 : référentiels SADMIN propagés au ClientDialog. */
  readonly paysList: readonly RefItem[];
  readonly devisesList: readonly RefItem[];
  readonly languesList: readonly RefItem[];
  /** T-01 Volet A : team-members SALES / AM pour selects salesResponsable / accountManager. */
  readonly salesList: readonly RefItem[];
  readonly amList: readonly RefItem[];
}

type DialogState = { kind: "none" } | { kind: "create" } | { kind: "edit"; client: ClientDTO };

export function ClientsTable(props: ClientsTableProps) {
  const t = useTranslations("clients");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  const buildHref = (cursor: string | null): string => {
    const sp = new URLSearchParams();
    if (cursor !== null) sp.set("cursor", cursor);
    if (props.currentQuery !== "") sp.set("q", props.currentQuery);
    if (props.currentStatut !== null) sp.set("statut", props.currentStatut);
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
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
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
                <TableCell className="font-mono text-xs">{c.codePays ?? "—"}</TableCell>
                <TableCell>
                  <ClientStatusBadge statut={c.statutClient} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {c.dateCreation.slice(0, 10)}
                </TableCell>
                <TableCell className="text-right">
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
      />

      {/* Indicateur silencieux pour réutiliser searchParams (évite warning lint) */}
      <span hidden>{searchParams.toString()}</span>
    </div>
  );
}
