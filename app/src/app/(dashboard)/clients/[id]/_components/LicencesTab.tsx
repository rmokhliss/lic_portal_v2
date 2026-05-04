// ==============================================================================
// LIC v2 — LicencesTab (Phase 5 étape 5.E)
//
// Tableau licences du client + Dialog création + bouton « Détail » → /licences/[id].
// La liste arrive prête depuis le Server Component parent (licences/page.tsx).
// ==============================================================================

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { createLicenceAction } from "../_actions";
import type { EntiteDTO } from "./clients-detail-types";
import { LicenceStatusBadge } from "./LicenceStatusBadge";
import type { LicenceDTO } from "./licence-types";

export interface LicencesTabProps {
  readonly clientId: string;
  readonly entites: readonly EntiteDTO[];
  readonly licences: readonly LicenceDTO[];
  readonly canEdit: boolean;
}

export function LicencesTab(props: LicencesTabProps) {
  const t = useTranslations("clients.detail.licencesTab");
  const [open, setOpen] = useState(false);

  // Map entiteId → nom pour affichage en table sans round-trip serveur.
  const entiteNomById = new Map<string, string>();
  for (const e of props.entites) entiteNomById.set(e.id, e.nom);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-foreground text-lg">{t("section")}</h2>
        {props.canEdit && props.entites.length > 0 && (
          <Button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            {t("newLicence")}
          </Button>
        )}
      </div>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.reference")}</TableHead>
            <TableHead>{t("table.entite")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead>{t("table.dateDebut")}</TableHead>
            <TableHead>{t("table.dateFin")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.licences.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            props.licences.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.reference}</TableCell>
                <TableCell>{entiteNomById.get(l.entiteId) ?? "—"}</TableCell>
                <TableCell>
                  <LicenceStatusBadge status={l.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {l.dateDebut.slice(0, 10)}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {l.dateFin.slice(0, 10)}
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/licences/${l.id}`}>{t("viewDetail")}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <CreateLicenceDialog
        open={open}
        onOpenChange={setOpen}
        clientId={props.clientId}
        entites={props.entites}
      />
    </>
  );
}

function CreateLicenceDialog({
  open,
  onOpenChange,
  clientId,
  entites,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly clientId: string;
  readonly entites: readonly EntiteDTO[];
}) {
  const t = useTranslations("clients.detail.licencesTab.dialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      clientId,
      entiteId: strReq(fd.get("entiteId")),
      dateDebut: `${strReq(fd.get("dateDebut"))}T00:00:00.000Z`,
      dateFin: `${strReq(fd.get("dateFin"))}T00:00:00.000Z`,
      commentaire: strOpt(fd.get("commentaire")),
      renouvellementAuto: fd.get("renouvellementAuto") === "on",
    };

    startTransition(() => {
      void (async () => {
        try {
          await createLicenceAction(payload, { clientId });
          setError("");
          onOpenChange(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="entiteId">{t("entiteId")}</Label>
            <select
              id="entiteId"
              name="entiteId"
              required
              defaultValue={entites[0]?.id ?? ""}
              className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
            >
              {entites.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dateDebut">{t("dateDebut")}</Label>
              <Input id="dateDebut" name="dateDebut" type="date" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateFin">{t("dateFin")}</Label>
              <Input id="dateFin" name="dateFin" type="date" required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="commentaire">{t("commentaire")}</Label>
            <Input id="commentaire" name="commentaire" maxLength={1000} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="renouvellementAuto" name="renouvellementAuto" />
            <Label htmlFor="renouvellementAuto">{t("renouvellementAuto")}</Label>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("creating") : t("submitCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function strReq(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function strOpt(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length === 0 ? undefined : s;
}
