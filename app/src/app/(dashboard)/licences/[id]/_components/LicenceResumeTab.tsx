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

import {
  changeLicenceStatusAction,
  generateLicenceFichierAction,
  importHealthcheckAction,
  updateLicenceAction,
} from "../_actions";
import type { LicenceDTO, LicenceStatusClient } from "./licence-detail-types";
import { LicenceStatusBadge } from "./LicenceStatusBadge";

const STATUTS: readonly LicenceStatusClient[] = ["ACTIF", "INACTIF", "SUSPENDU", "EXPIRE"];

/** Phase 23 — statut fichier .lic envoyé par le Server Component parent. */
export type LicFileStatus =
  | { readonly status: "never"; readonly currentHash: string }
  | {
      readonly status: "fresh";
      readonly currentHash: string;
      readonly storedHash: string;
      readonly generatedAt: string;
    }
  | {
      readonly status: "stale";
      readonly currentHash: string;
      readonly storedHash: string;
      readonly generatedAt: string;
    };

export interface LicenceResumeTabProps {
  readonly licence: LicenceDTO;
  readonly clientLabel: string;
  readonly entiteLabel: string;
  readonly canEdit: boolean;
  /** Phase 22 R-49 — nombre d'articles attachés. 0 = bouton .lic disabled
   *  + tooltip "Aucun article attaché à cette licence". */
  readonly articlesCount: number;
  /** Phase 23 — affiche une bannière "fichier .lic obsolète" si stale. */
  readonly licFileStatus: LicFileStatus | null;
}

type DialogState = { kind: "none" } | { kind: "edit" } | { kind: "status" };

export function LicenceResumeTab({
  licence,
  clientLabel,
  entiteLabel,
  canEdit,
  articlesCount,
  licFileStatus,
}: LicenceResumeTabProps) {
  const t = useTranslations("licences.detail.resume");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  return (
    <>
      {/* Phase 23 — bannière "fichier .lic obsolète" : produits/articles/
           volumes ont changé depuis la dernière génération .lic. */}
      {licFileStatus !== null && licFileStatus.status === "stale" && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p className="font-medium">⚠ Fichier .lic obsolète</p>
          <p className="mt-1 text-xs">
            Le contenu produit / article / volume a été modifié depuis la dernière génération (
            {new Date(licFileStatus.generatedAt).toLocaleString("fr-FR")}). Il faut regénérer le
            fichier .lic pour que le client reçoive la dernière configuration.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-foreground text-lg">{t("section")}</h2>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
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
            <GenerateLicFileButton licenceId={licence.id} articlesCount={articlesCount} />
            <ImportHealthcheckButton licenceId={licence.id} />
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
          const r = await updateLicenceAction(patch);
          if (!r.success) {
            setError(r.error);
            return;
          }
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

  // Phase 20 R-28 — humanise les codes d'erreur métier les plus fréquents.
  const humanizeStatusError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes("SPX-LIC-733")) {
      return "Transition de statut interdite. Vérifier le statut courant et le statut cible (ex: une licence EXPIRE ne peut plus revenir ACTIF).";
    }
    if (raw.includes("SPX-LIC-734")) {
      return "Conflit de version : la licence a été modifiée entre temps. Recharger la page et réessayer.";
    }
    if (raw.includes("SPX-LIC-735")) {
      return "Licence introuvable. Recharger la page.";
    }
    return raw.length > 0 ? raw : "Erreur";
  };

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newStatus === licence.status) {
      onOpenChange(false);
      return;
    }
    startTransition(() => {
      void (async () => {
        try {
          const r = await changeLicenceStatusAction({
            licenceId: licence.id,
            expectedVersion: licence.version,
            newStatus,
          });
          if (!r.success) {
            setError(humanizeStatusError(r.error));
            return;
          }
          setError("");
          onOpenChange(false);
        } catch (err) {
          setError(humanizeStatusError(err));
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

// ============================================================================
// Phase 10.C — Bouton "Générer .lic"
//
// Stub PKI : déclenche la Server Action, récupère le contenu JSON + hash, et
// déclenche un download navigateur via blob URL. Pas de signature RSA — TODO
// Phase 3 (DETTE-LIC-008).
// ============================================================================

function GenerateLicFileButton({
  licenceId,
  articlesCount,
}: {
  readonly licenceId: string;
  readonly articlesCount: number;
}) {
  const t = useTranslations("licences.detail.resume.licFile");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  // Phase 22 R-49 — disable + tooltip si aucun article attaché.
  const noArticles = articlesCount === 0;

  // Phase 20 R-31 — transformation du raw error en message UX explicite avec
  // remediation pour les codes les plus fréquents : CA absente / cert client
  // manquant. Les autres erreurs propagent leur message.
  const humanizeError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes("SPX-LIC-411")) {
      return "CA S2M non générée. Aller dans /settings/sécurité pour générer la CA avant de produire un fichier .lic.";
    }
    if (raw.includes("SPX-LIC-412") || raw.includes("client_certificate_pem")) {
      return "Ce client n'a pas de certificat PKI. Lancer le backfill dans /settings/sécurité pour émettre un certificat client.";
    }
    if (raw.includes("SPX-LIC-413")) {
      return "Clé privée client illisible (déchiffrement AES échoué). Vérifier APP_MASTER_KEY ou re-émettre le cert via le backfill.";
    }
    return raw.length > 0 ? raw : "Erreur génération .lic";
  };

  const onGenerate = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const r = await generateLicenceFichierAction({ licenceId });
          if (!r.success) {
            setError(humanizeError(r.error));
            return;
          }
          const blob = new Blob([r.data.contentJson], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = r.data.filename;
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          setError(humanizeError(err));
        }
      })();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onGenerate}
        disabled={pending || noArticles}
        title={noArticles ? "Aucun article attaché à cette licence" : undefined}
      >
        {pending ? t("generating") : t("generate")}
      </Button>
      {error !== "" && <p className="text-destructive mt-1 whitespace-normal text-xs">{error}</p>}
    </>
  );
}

// ============================================================================
// Phase 10.D — Bouton "Importer healthcheck"
//
// Upload <input type="file"> → lit en string → envoie à la Server Action
// importHealthcheckAction (CSV ou JSON). Réponse : nb articles updated +
// éventuelles erreurs ligne par ligne.
// ============================================================================

function ImportHealthcheckButton({ licenceId }: { readonly licenceId: string }) {
  const t = useTranslations("licences.detail.resume.healthcheck");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    setError("");
    setInfo("");
    startTransition(() => {
      void (async () => {
        try {
          const content = await file.text();
          const r = await importHealthcheckAction({
            licenceId,
            filename: file.name,
            content,
          });
          if (!r.success) {
            setError(r.error);
            return;
          }
          setInfo(t("doneSummary", { updated: r.data.updated, errors: r.data.errors }));
          // reset file input
          e.target.value = "";
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <>
      <label
        className={`border-input bg-background hover:bg-accent inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium ${pending ? "opacity-50" : ""}`}
      >
        {pending ? t("importing") : t("import")}
        <input
          type="file"
          accept=".csv,.json,application/json,text/csv"
          className="hidden"
          onChange={onChange}
          disabled={pending}
        />
      </label>
      {info !== "" && <span className="text-success ml-2 text-xs">{info}</span>}
      {error !== "" && <span className="text-destructive ml-2 text-xs">{error}</span>}
    </>
  );
}
