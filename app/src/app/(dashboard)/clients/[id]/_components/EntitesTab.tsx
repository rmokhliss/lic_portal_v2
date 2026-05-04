// ==============================================================================
// LIC v2 — EntitesTab (Phase 4 étape 4.F)
// Table + Dialog create/edit + toggle actif. ADMIN/SADMIN seuls peuvent
// muter (via canEdit prop).
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toggleEntiteActiveAction } from "../_actions";
import { EntiteDialog } from "./EntiteDialog";
import type { EntiteDTO } from "./clients-detail-types";

export interface EntitesTabProps {
  readonly clientId: string;
  readonly rows: readonly EntiteDTO[];
  readonly canEdit: boolean;
}

type DialogState = { kind: "none" } | { kind: "create" } | { kind: "edit"; entite: EntiteDTO };

export function EntitesTab(props: EntitesTabProps) {
  const t = useTranslations("clients.detail.entites");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-foreground text-lg">{t("section")}</h2>
        {props.canEdit && (
          <Button
            type="button"
            onClick={() => {
              setDialog({ kind: "create" });
            }}
          >
            {t("newEntite")}
          </Button>
        )}
      </div>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.nom")}</TableHead>
            <TableHead>{t("table.codePays")}</TableHead>
            <TableHead>{t("table.actif")}</TableHead>
            <TableHead>{t("table.dateCreation")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            props.rows.map((e) => (
              <EntiteRow
                key={e.id}
                entite={e}
                clientId={props.clientId}
                canEdit={props.canEdit}
                onEdit={() => {
                  setDialog({ kind: "edit", entite: e });
                }}
              />
            ))
          )}
        </TableBody>
      </Table>

      <EntiteDialog
        open={dialog.kind === "create" || dialog.kind === "edit"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        clientId={props.clientId}
        mode={dialog.kind === "edit" ? "edit" : "create"}
        entite={dialog.kind === "edit" ? dialog.entite : undefined}
      />
    </>
  );
}

function EntiteRow({
  entite,
  clientId,
  canEdit,
  onEdit,
}: {
  readonly entite: EntiteDTO;
  readonly clientId: string;
  readonly canEdit: boolean;
  readonly onEdit: () => void;
}) {
  const t = useTranslations("clients.detail.entites");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onToggle = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          await toggleEntiteActiveAction({ entiteId: entite.id }, { clientId });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{entite.nom}</TableCell>
      <TableCell className="font-mono text-xs">{entite.codePays ?? "—"}</TableCell>
      <TableCell>
        <span
          className={
            entite.actif
              ? "bg-success/15 text-success border-success/40 inline-block rounded-full border px-2 py-0.5 text-xs"
              : "bg-muted text-muted-foreground border-border inline-block rounded-full border px-2 py-0.5 text-xs"
          }
        >
          {entite.actif ? t("actif") : t("inactif")}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {entite.dateCreation.slice(0, 10)}
      </TableCell>
      <TableCell className="text-right">
        {canEdit && (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              {t("edit")}
            </Button>
            <Button
              type="button"
              variant={entite.actif ? "outline" : "secondary"}
              size="sm"
              disabled={pending}
              onClick={onToggle}
            >
              {entite.actif ? t("deactivate") : t("activate")}
            </Button>
          </div>
        )}
        {error !== "" && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>
    </TableRow>
  );
}
