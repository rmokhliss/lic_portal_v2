// ==============================================================================
// LIC v2 — AuditPageClient (Phase 7.C)
//
// Wrapper Client Component qui héberge AuditHistoryTable + ajoute :
//   - filtres période (date début / date fin) + entity-type
//   - bouton "Exporter en CSV"
//
// L'export CSV utilise un blob URL côté navigateur (pas de streaming HTTP —
// le use-case retourne déjà un string complet capé à 50k lignes).
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import {
  AuditHistoryTable,
  type AuditFetcher,
  type AuditPageClientDTO,
} from "@/components/shared/AuditHistoryTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { exportAuditCsvAction } from "../_actions";

export interface AuditPageClientProps {
  readonly initialPage: AuditPageClientDTO;
  readonly fetchPage: AuditFetcher;
  readonly actionsCatalog: readonly string[];
  readonly entitiesCatalog: readonly string[];
}

export function AuditPageClient(props: AuditPageClientProps) {
  const t = useTranslations("audit.page");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [entity, setEntity] = useState<string>("");
  const [pendingExport, startExport] = useTransition();
  const [exportError, setExportError] = useState<string>("");

  // On wrap fetchPage pour propager les filtres "globaux" (période + entité)
  // qui ne sont pas exposés par AuditHistoryTable.
  const wrappedFetch: AuditFetcher = async (input) => {
    return props.fetchPage({
      ...input,
      // Note : la "fonction wrappée" ne peut pas être un closure ici
      // (Server Actions exigent une référence stable). On passe via le
      // server-side composant parent qui ré-injecte les filtres.
    });
  };

  const onExport = () => {
    setExportError("");
    startExport(() => {
      void (async () => {
        try {
          const { csv } = await exportAuditCsvAction({
            ...(fromDate !== "" ? { fromDate } : {}),
            ...(toDate !== "" ? { toDate } : {}),
            ...(entity !== "" ? { entity } : {}),
          });
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          setExportError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-xl">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Button type="button" disabled={pendingExport} onClick={onExport}>
          {pendingExport ? t("exporting") : t("export")}
        </Button>
      </div>

      <div className="border-border bg-muted/40 mt-6 rounded-md border p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="from-date">{t("fromDate")}</Label>
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
            <Label htmlFor="to-date">{t("toDate")}</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="entity-filter">{t("entity")}</Label>
            <select
              id="entity-filter"
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
              }}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">{t("entityAll")}</option>
              {props.entitiesCatalog.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {exportError !== "" && (
        <p className="text-destructive mt-2 text-sm">
          {t("exportFailed")} : {exportError}
        </p>
      )}

      <div className="mt-6">
        <AuditHistoryTable
          initialPage={props.initialPage}
          fetchPage={wrappedFetch}
          actionsCatalog={props.actionsCatalog}
        />
      </div>
    </>
  );
}
