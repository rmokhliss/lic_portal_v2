// ==============================================================================
// LIC v2 — RenouvellementsTab (Phase 9.A — refactor Phase 5.F)
//
// Refactor Phase 9.A : remplacement du Dialog standard par un Sheet (drawer
// latéral) pour création / édition. Données plus riches → drawer plus adapté.
// Boutons Valider / Annuler ouvrent un Dialog de confirmation (pattern
// ConfirmResetPasswordDialog).
//
// 4 actions :
//   - Créer : Sheet (form vide)
//   - Éditer : Sheet pré-rempli (uniquement si statut EN_COURS ou CREE)
//   - Valider : ConfirmDialog → validerRenouvellementAction
//   - Annuler : ConfirmDialog avec champ motif → annulerRenouvellementAction
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  updateRenouvellementAction,
  validerRenouvellementAction,
} from "../_actions";
import type { RenewStatusClient, RenouvellementDTO } from "./licence-detail-types";

const STATUS_STYLES: Record<RenewStatusClient, string> = {
  EN_COURS: "bg-info/15 text-info border-info/40",
  VALIDE: "bg-success/15 text-success border-success/40",
  CREE: "bg-muted text-muted-foreground border-border",
  ANNULE: "bg-destructive/15 text-destructive border-destructive/40",
};

export interface RenouvellementsTabProps {
  readonly licenceId: string;
  readonly renouvellements: readonly RenouvellementDTO[];
  /** ADMIN/SADMIN — peut créer / éditer / annuler un renouvellement. */
  readonly canEdit: boolean;
  /** SADMIN seulement — peut valider un renouvellement (engage la mise à
   *  jour des dates licence). ADMIN initie, SADMIN valide. */
  readonly canValidate: boolean;
}

type DrawerState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; renouv: RenouvellementDTO };

type ConfirmState =
  | { kind: "none" }
  | { kind: "valider"; renouv: RenouvellementDTO }
  | { kind: "annuler"; renouv: RenouvellementDTO };

export function RenouvellementsTab(props: RenouvellementsTabProps) {
  const t = useTranslations("licences.detail.renouvellements");
  const [drawer, setDrawer] = useState<DrawerState>({ kind: "none" });
  const [confirm, setConfirm] = useState<ConfirmState>({ kind: "none" });

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-foreground text-lg">{t("section")}</h2>
        {props.canEdit && (
          <Button
            type="button"
            onClick={() => {
              setDrawer({ kind: "create" });
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
                canEdit={props.canEdit}
                canValidate={props.canValidate}
                onEdit={() => {
                  setDrawer({ kind: "edit", renouv: r });
                }}
                onValider={() => {
                  setConfirm({ kind: "valider", renouv: r });
                }}
                onAnnuler={() => {
                  setConfirm({ kind: "annuler", renouv: r });
                }}
              />
            ))
          )}
        </TableBody>
      </Table>

      <RenouvellementDrawer
        state={drawer}
        licenceId={props.licenceId}
        onClose={() => {
          setDrawer({ kind: "none" });
        }}
      />

      <ValiderConfirmDialog
        state={confirm}
        licenceId={props.licenceId}
        onClose={() => {
          setConfirm({ kind: "none" });
        }}
      />

      <AnnulerConfirmDialog
        state={confirm}
        licenceId={props.licenceId}
        onClose={() => {
          setConfirm({ kind: "none" });
        }}
      />
    </>
  );
}

function RenouvRow({
  renouv,
  canEdit,
  canValidate,
  onEdit,
  onValider,
  onAnnuler,
}: {
  readonly renouv: RenouvellementDTO;
  readonly canEdit: boolean;
  readonly canValidate: boolean;
  readonly onEdit: () => void;
  readonly onValider: () => void;
  readonly onAnnuler: () => void;
}) {
  const t = useTranslations("licences.detail.renouvellements");
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
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              {t("edit")}
            </Button>
            {canValidate && (
              <Button type="button" variant="default" size="sm" onClick={onValider}>
                {t("valider")}
              </Button>
            )}
            <Button type="button" variant="destructive" size="sm" onClick={onAnnuler}>
              {t("annuler")}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function RenouvellementDrawer({
  state,
  licenceId,
  onClose,
}: {
  readonly state: DrawerState;
  readonly licenceId: string;
  readonly onClose: () => void;
}) {
  const t = useTranslations("licences.detail.renouvellements.drawer");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  if (state.kind === "none") return null;

  const isEdit = state.kind === "edit";
  const initial = isEdit ? state.renouv : null;
  const initialDebut = initial?.nouvelleDateDebut.slice(0, 10) ?? "";
  const initialFin = initial?.nouvelleDateFin.slice(0, 10) ?? "";
  const initialComm = initial?.commentaire ?? "";

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const debut = strReq(fd.get("nouvelleDateDebut"));
    const fin = strReq(fd.get("nouvelleDateFin"));
    const commentaireRaw = fd.get("commentaire");
    const commentaire = typeof commentaireRaw === "string" ? commentaireRaw.trim() : "";

    startTransition(() => {
      void (async () => {
        try {
          if (isEdit && initial !== null) {
            const r = await updateRenouvellementAction(
              {
                renouvellementId: initial.id,
                nouvelleDateDebut: `${debut}T00:00:00.000Z`,
                nouvelleDateFin: `${fin}T00:00:00.000Z`,
                commentaire: commentaire === "" ? null : commentaire,
              },
              { licenceId },
            );
            if (!r.success) {
              setError(r.error);
              return;
            }
          } else {
            const r = await createRenouvellementAction(
              {
                licenceId,
                nouvelleDateDebut: `${debut}T00:00:00.000Z`,
                nouvelleDateFin: `${fin}T00:00:00.000Z`,
                ...(commentaire !== "" ? { commentaire } : {}),
              },
              { licenceId },
            );
            if (!r.success) {
              setError(r.error);
              return;
            }
          }
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? t("editTitle") : t("createTitle")}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="nouvelleDateDebut">{t("nouvelleDateDebut")}</Label>
            <Input
              id="nouvelleDateDebut"
              name="nouvelleDateDebut"
              type="date"
              defaultValue={initialDebut}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nouvelleDateFin">{t("nouvelleDateFin")}</Label>
            <Input
              id="nouvelleDateFin"
              name="nouvelleDateFin"
              type="date"
              defaultValue={initialFin}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="commentaire">{t("commentaire")}</Label>
            <textarea
              id="commentaire"
              name="commentaire"
              maxLength={1000}
              rows={4}
              defaultValue={initialComm}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          {error !== "" && <p className="text-destructive text-sm">{error}</p>}
          <SheetFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("submitting") : isEdit ? t("submitEdit") : t("submitCreate")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ValiderConfirmDialog({
  state,
  licenceId,
  onClose,
}: {
  readonly state: ConfirmState;
  readonly licenceId: string;
  readonly onClose: () => void;
}) {
  const t = useTranslations("licences.detail.renouvellements.validerConfirm");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  if (state.kind !== "valider") return null;

  const onConfirm = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const r = await validerRenouvellementAction(
            { renouvellementId: state.renouv.id },
            { licenceId },
          );
          if (!r.success) {
            setError(r.error);
            return;
          }
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
        <p className="text-muted-foreground text-sm">
          {t("body", {
            debut: state.renouv.nouvelleDateDebut.slice(0, 10),
            fin: state.renouv.nouvelleDateFin.slice(0, 10),
          })}
        </p>
        {error !== "" && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="default" onClick={onConfirm} disabled={pending}>
            {pending ? t("submitting") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnnulerConfirmDialog({
  state,
  licenceId,
  onClose,
}: {
  readonly state: ConfirmState;
  readonly licenceId: string;
  readonly onClose: () => void;
}) {
  const t = useTranslations("licences.detail.renouvellements.annulerConfirm");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  if (state.kind !== "annuler") return null;

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const motifRaw = fd.get("motif");
    const motif = typeof motifRaw === "string" ? motifRaw.trim() : "";
    startTransition(() => {
      void (async () => {
        try {
          const r = await annulerRenouvellementAction(
            {
              renouvellementId: state.renouv.id,
              ...(motif !== "" ? { motif } : {}),
            },
            { licenceId },
          );
          if (!r.success) {
            setError(r.error);
            return;
          }
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
          <p className="text-muted-foreground text-sm">{t("body")}</p>
          <div className="space-y-1">
            <Label htmlFor="motif">{t("motif")}</Label>
            <Input id="motif" name="motif" maxLength={500} placeholder={t("motifPlaceholder")} />
          </div>
          {error !== "" && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? t("submitting") : t("confirm")}
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
