// ==============================================================================
// LIC v2 — RenouvellementsTab (Phase 5.F)
// Liste + Dialog création + boutons Valider / Annuler par row.
// ==============================================================================

"use client";

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

import {
  annulerRenouvellementAction,
  createRenouvellementAction,
  validerRenouvellementAction,
} from "../_actions";
import type { RenewStatusClient, RenouvellementDTO } from "./licence-detail-types";

const STATUS_STYLES: Record<RenewStatusClient, string> = {
  EN_COURS: "bg-info/15 text-info border-info/40",
  VALIDE: "bg-success/15 text-success border-success/40",
  CREE: "bg-success/15 text-success border-success/40",
  ANNULE: "bg-destructive/15 text-destructive border-destructive/40",
};

export interface RenouvellementsTabProps {
  readonly licenceId: string;
  readonly renouvellements: readonly RenouvellementDTO[];
  readonly canEdit: boolean;
}

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "annuler"; renouv: RenouvellementDTO };

export function RenouvellementsTab(props: RenouvellementsTabProps) {
  const t = useTranslations("licences.detail.renouvellements");
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
            {t("newRenouvellement")}
          </Button>
        )}
      </div>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.dateCreation")}</TableHead>
            <TableHead>{t("table.nouvelleDateDebut")}</TableHead>
            <TableHead>{t("table.nouvelleDateFin")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.renouvellements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            props.renouvellements.map((r) => (
              <RenouvRow
                key={r.id}
                renouv={r}
                licenceId={props.licenceId}
                canEdit={props.canEdit}
                onAnnuler={() => {
                  setDialog({ kind: "annuler", renouv: r });
                }}
              />
            ))
          )}
        </TableBody>
      </Table>

      <CreateDialog
        open={dialog.kind === "create"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        licenceId={props.licenceId}
      />

      <AnnulerDialog
        state={dialog}
        licenceId={props.licenceId}
        onClose={() => {
          setDialog({ kind: "none" });
        }}
      />
    </>
  );
}

function RenouvRow({
  renouv,
  licenceId,
  canEdit,
  onAnnuler,
}: {
  readonly renouv: RenouvellementDTO;
  readonly licenceId: string;
  readonly canEdit: boolean;
  readonly onAnnuler: () => void;
}) {
  const t = useTranslations("licences.detail.renouvellements");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onValider = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          await validerRenouvellementAction({ renouvellementId: renouv.id }, { licenceId });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  const isEnCours = renouv.status === "EN_COURS";

  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-xs">
        {renouv.dateCreation.slice(0, 10)}
      </TableCell>
      <TableCell className="text-xs">{renouv.nouvelleDateDebut.slice(0, 10)}</TableCell>
      <TableCell className="text-xs">{renouv.nouvelleDateFin.slice(0, 10)}</TableCell>
      <TableCell>
        <span
          className={`inline-block rounded-full border px-2 py-0.5 font-mono text-xs ${STATUS_STYLES[renouv.status]}`}
        >
          {renouv.status}
        </span>
      </TableCell>
      <TableCell className="text-right">
        {canEdit && isEnCours && (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={pending}
              onClick={onValider}
            >
              {t("valider")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={onAnnuler}
            >
              {t("annuler")}
            </Button>
          </div>
        )}
        {error !== "" && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>
    </TableRow>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  licenceId,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly licenceId: string;
}) {
  const t = useTranslations("licences.detail.renouvellements.createDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      licenceId,
      nouvelleDateDebut: `${strReq(fd.get("nouvelleDateDebut"))}T00:00:00.000Z`,
      nouvelleDateFin: `${strReq(fd.get("nouvelleDateFin"))}T00:00:00.000Z`,
      commentaire: strOpt(fd.get("commentaire")),
    };
    startTransition(() => {
      void (async () => {
        try {
          await createRenouvellementAction(payload, { licenceId });
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
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nouvelleDateDebut">{t("nouvelleDateDebut")}</Label>
              <Input id="nouvelleDateDebut" name="nouvelleDateDebut" type="date" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nouvelleDateFin">{t("nouvelleDateFin")}</Label>
              <Input id="nouvelleDateFin" name="nouvelleDateFin" type="date" required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="commentaire">{t("commentaire")}</Label>
            <Input id="commentaire" name="commentaire" maxLength={1000} />
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
              {pending ? t("creating") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AnnulerDialog({
  state,
  licenceId,
  onClose,
}: {
  readonly state: DialogState;
  readonly licenceId: string;
  readonly onClose: () => void;
}) {
  const t = useTranslations("licences.detail.renouvellements.annulerDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  if (state.kind !== "annuler") {
    return null;
  }

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      renouvellementId: state.renouv.id,
      motif: strOpt(fd.get("motif")),
    };
    startTransition(() => {
      void (async () => {
        try {
          await annulerRenouvellementAction(payload, { licenceId });
          setError("");
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="motif">{t("motif")}</Label>
            <Input id="motif" name="motif" maxLength={500} />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
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
