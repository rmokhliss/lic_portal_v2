// ==============================================================================
// LIC v2 — RenewalsList (Phase 9.B)
//
// Page /renewals : tous les renouvellements cross-clients. Filtres status +
// client + période. Cursor pagination "Charger plus". Lien drill-down vers
// /licences/{licenceId}/renouvellements pour action.
// ==============================================================================

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { searchRenouvellementsAction } from "../_actions";

export type RenewStatusClient = "EN_COURS" | "VALIDE" | "CREE" | "ANNULE";

export interface RenouvellementListItem {
  readonly id: string;
  readonly licenceId: string;
  readonly nouvelleDateDebut: string;
  readonly nouvelleDateFin: string;
  readonly status: RenewStatusClient;
  readonly commentaire: string | null;
  readonly dateCreation: string;
}

export interface ClientOption {
  readonly id: string;
  readonly label: string;
}

export interface RenewalsListProps {
  readonly initialItems: readonly RenouvellementListItem[];
  readonly initialCursor: string | null;
  readonly clients: readonly ClientOption[];
}

const STATUS_STYLES: Record<RenewStatusClient, string> = {
  EN_COURS: "bg-info/15 text-info border-info/40",
  VALIDE: "bg-success/15 text-success border-success/40",
  CREE: "bg-muted text-muted-foreground border-border",
  ANNULE: "bg-destructive/15 text-destructive border-destructive/40",
};

export function RenewalsList(props: RenewalsListProps) {
  const t = useTranslations("renewals.page");
  const [items, setItems] = useState<readonly RenouvellementListItem[]>(props.initialItems);
  const [cursor, setCursor] = useState<string | null>(props.initialCursor);
  const [filterStatus, setFilterStatus] = useState<string>("EN_COURS");
  const [filterClient, setFilterClient] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const refresh = (resetCursor: boolean) => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const page = await searchRenouvellementsAction({
            ...(resetCursor ? {} : { cursor: cursor ?? undefined }),
            ...(filterStatus !== "" ? { status: filterStatus } : {}),
            ...(filterClient !== "" ? { clientId: filterClient } : {}),
            ...(fromDate !== "" ? { fromDate } : {}),
            ...(toDate !== "" ? { toDate } : {}),
          });
          const fetched = page.items as readonly RenouvellementListItem[];
          if (resetCursor) {
            setItems(fetched);
          } else {
            setItems([...items, ...fetched]);
          }
          setCursor(page.nextCursor);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <>
      <div>
        <h1 className="font-display text-foreground text-xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="border-border bg-muted/40 mt-6 rounded-md border p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="filter-status">{t("filter.status")}</Label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
              }}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">{t("filter.statusAll")}</option>
              <option value="EN_COURS">EN_COURS</option>
              <option value="VALIDE">VALIDE</option>
              <option value="CREE">CREE</option>
              <option value="ANNULE">ANNULE</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-client">{t("filter.client")}</Label>
            <select
              id="filter-client"
              value={filterClient}
              onChange={(e) => {
                setFilterClient(e.target.value);
              }}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">{t("filter.clientAll")}</option>
              {props.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="from-date">{t("filter.fromDate")}</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to-date">{t("filter.toDate")}</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
              }}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => {
                refresh(true);
              }}
              disabled={pending}
            >
              {pending ? t("filter.applying") : t("filter.apply")}
            </Button>
          </div>
        </div>
      </div>

      {error !== "" && <p className="text-destructive mt-2 text-sm">{error}</p>}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.dateCreation")}</TableHead>
            <TableHead>{t("table.licence")}</TableHead>
            <TableHead>{t("table.nouvelleDateDebut")}</TableHead>
            <TableHead>{t("table.nouvelleDateFin")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {r.dateCreation.slice(0, 10)}
                </TableCell>
                <TableCell className="font-mono text-xs">{r.licenceId.slice(0, 8)}…</TableCell>
                <TableCell className="text-xs">{r.nouvelleDateDebut.slice(0, 10)}</TableCell>
                <TableCell className="text-xs">{r.nouvelleDateFin.slice(0, 10)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 font-mono text-xs ${STATUS_STYLES[r.status]}`}
                  >
                    {r.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/licences/${r.licenceId}/renouvellements`}
                    className="text-info text-xs underline"
                  >
                    {t("table.open")}
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {cursor !== null && (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              refresh(false);
            }}
          >
            {pending ? t("loading") : t("loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}
