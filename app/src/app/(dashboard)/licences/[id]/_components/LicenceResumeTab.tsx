// ==============================================================================
// LIC v2 — LicenceResumeTab (Phase 5.F)
//
// Infos licence en grille label/valeur. Boutons Modifier infos / Changer statut
// (canEdit ADMIN/SADMIN). Optimistic locking via expectedVersion (L4).
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

import { changeLicenceStatusAction, updateLicenceAction } from "../_actions";
import type { LicenceDTO, LicenceStatusClient } from "./licence-detail-types";
import { LicenceStatusBadge } from "./LicenceStatusBadge";

const STATUTS: readonly LicenceStatusClient[] = ["ACTIF", "INACTIF", "SUSPENDU", "EXPIRE"];

export interface LicenceResumeTabProps {
  readonly licence: LicenceDTO;
  readonly clientLabel: string;
  readonly entiteLabel: string;
  readonly canEdit: boolean;
}

type DialogState = { kind: "none" } | { kind: "edit" } | { kind: "status" };

export function LicenceResumeTab({
  licence,
  clientLabel,
  entiteLabel,
  canEdit,
}: LicenceResumeTabProps) {
  const t = useTranslations("licences.detail.resume");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-foreground text-lg">{t("section")}</h2>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialog({ kind: "edit" });
              }}
            >
              {t("editInfo")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setDialog({ kind: "status" });
              }}
            >
              {t("changeStatus")}
            </Button>
          </div>
        )}
      </div>

      <dl className="border-border divide-border mt-4 grid grid-cols-1 divide-y rounded-md border md:grid-cols-2 md:gap-x-8 md:divide-y-0">
        <Row
          label={t("fields.reference")}
          value={<span className="font-mono">{licence.reference}</span>}
        />
        <Row label={t("fields.status")} value={<LicenceStatusBadge status={licence.status} />} />
        <Row label={t("fields.client")} value={clientLabel} />
        <Row label={t("fields.entite")} value={entiteLabel} />
        <Row label={t("fields.dateDebut")} value={licence.dateDebut.slice(0, 10)} />
        <Row label={t("fields.dateFin")} value={licence.dateFin.slice(0, 10)} />
        <Row
          label={t("fields.renouvellementAuto")}
          value={licence.renouvellementAuto ? t("yes") : t("no")}
        />
        <Row label={t("fields.notifEnvoyee")} value={licence.notifEnvoyee ? t("yes") : t("no")} />
        <Row label={t("fields.commentaire")} value={licence.commentaire ?? "—"} />
        <Row label={t("fields.dateCreation")} value={licence.dateCreation.slice(0, 10)} />
        <Row label={t("fields.version")} value={String(licence.version)} />
      </dl>

      <EditDialog
        open={dialog.kind === "edit"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        licence={licence}
      />

      <StatusDialog
        open={dialog.kind === "status"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        licence={licence}
      />
    </>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 items-center gap-2 px-4 py-2.5">
      <dt className="text-muted-foreground text-xs uppercase tracking-wider">{label}</dt>
      <dd className="text-foreground text-sm">{value}</dd>
    </div>
  );
}

function EditDialog({
  open,
  onOpenChange,
  licence,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly licence: LicenceDTO;
}) {
  const t = useTranslations("licences.detail.resume.editDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dateDebut = strReq(fd.get("dateDebut"));
    const dateFin = strReq(fd.get("dateFin"));
    const commentaire = strOpt(fd.get("commentaire"));
    const renouvellementAuto = fd.get("renouvellementAuto") === "on";

    const patch: Record<string, unknown> = {
      licenceId: licence.id,
      expectedVersion: licence.version,
    };
    if (dateDebut !== licence.dateDebut.slice(0, 10)) {
      patch.dateDebut = `${dateDebut}T00:00:00.000Z`;
    }
    if (dateFin !== licence.dateFin.slice(0, 10)) {
      patch.dateFin = `${dateFin}T00:00:00.000Z`;
    }
    if (commentaire !== (licence.commentaire ?? undefined)) {
      patch.commentaire = commentaire ?? "";
    }
    if (renouvellementAuto !== licence.renouvellementAuto) {
      patch.renouvellementAuto = renouvellementAuto;
    }

    startTransition(() => {
      void (async () => {
        try {
          await updateLicenceAction(patch);
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
              <Label htmlFor="dateDebut">{t("dateDebut")}</Label>
              <Input
                id="dateDebut"
                name="dateDebut"
                type="date"
                required
                defaultValue={licence.dateDebut.slice(0, 10)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateFin">{t("dateFin")}</Label>
              <Input
                id="dateFin"
                name="dateFin"
                type="date"
                required
                defaultValue={licence.dateFin.slice(0, 10)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="commentaire">{t("commentaire")}</Label>
            <Input
              id="commentaire"
              name="commentaire"
              maxLength={1000}
              defaultValue={licence.commentaire ?? ""}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="renouvellementAuto"
              name="renouvellementAuto"
              defaultChecked={licence.renouvellementAuto}
            />
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
              {pending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({
  open,
  onOpenChange,
  licence,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly licence: LicenceDTO;
}) {
  const t = useTranslations("licences.detail.resume.statusDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [newStatus, setNewStatus] = useState<LicenceStatusClient>(licence.status);

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newStatus === licence.status) {
      onOpenChange(false);
      return;
    }
    startTransition(() => {
      void (async () => {
        try {
          await changeLicenceStatusAction({
            licenceId: licence.id,
            expectedVersion: licence.version,
            newStatus,
          });
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
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="newStatus">{t("newStatus")}</Label>
            <select
              id="newStatus"
              value={newStatus}
              onChange={(e) => {
                setNewStatus(e.target.value as LicenceStatusClient);
              }}
              className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
            >
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
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
