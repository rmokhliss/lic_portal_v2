// ==============================================================================
// LIC v2 — ImportHealthcheckClientButton (Phase 10.D)
//
// Bouton "Importer healthcheck" dans le layout /clients/[id]. Ouvre un Dialog
// avec :
//   - sélection d'une licence ACTIVE du client
//   - upload du fichier CSV/JSON
//   - feedback nb articles updated + erreurs
//
// Le bouton n'est plus désactivé Phase 10.D — la PKI (vérification signature
// certificat client) reste différée Phase 3 mais le parsing brut fonctionne.
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
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { importHealthcheckClientAction } from "../_actions";

export interface LicenceOption {
  readonly id: string;
  readonly reference: string;
  readonly status: string;
}

export interface ImportHealthcheckClientButtonProps {
  readonly clientId: string;
  readonly licences: readonly LicenceOption[];
}

export function ImportHealthcheckClientButton(props: ImportHealthcheckClientButtonProps) {
  const t = useTranslations("clients.detail.healthcheck");
  const [open, setOpen] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  // Phase 20 R-25 — accepter toutes les licences (pas seulement ACTIF). Un
  // client peut envoyer un .hc sur une licence SUSPENDU/EXPIRE pour suivi
  // historique de volumes. Le bouton n'est désactivé QUE si zéro licence.
  const importableLicences = props.licences;

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const fd = new FormData(e.currentTarget);
    const licenceId = strReq(fd.get("licenceId"));
    const fileEntry = fd.get("file");
    if (!(fileEntry instanceof File)) {
      setError(t("noFile"));
      return;
    }
    startTransition(() => {
      void (async () => {
        try {
          const content = await fileEntry.text();
          const r = await importHealthcheckClientAction({
            licenceId,
            filename: fileEntry.name,
            content,
          });
          if (!r.success) {
            setError(r.error);
            return;
          }
          setInfo(t("doneSummary", { updated: r.data.updated, errors: r.data.errors }));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={importableLicences.length === 0}
        title={importableLicences.length === 0 ? t("noActiveLicence") : undefined}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("importHealthcheck")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setError("");
            setInfo("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <p className="text-muted-foreground text-xs">{t("pkiNote")}</p>
            <div className="space-y-1">
              <Label htmlFor="licenceId">{t("licenceLabel")}</Label>
              {/* Phase 16 — DETTE-LIC-013 : combobox recherche textuelle pour
                   licences (volume potentiel >200 — ex: gros bancaire). */}
              <SearchableSelect
                id="licenceId"
                name="licenceId"
                required
                placeholder={t("licencePlaceholder")}
                options={importableLicences.map((l) => ({
                  value: l.id,
                  // Phase 20 R-25 — affiche le statut entre parenthèses pour
                  // que l'utilisateur sache s'il importe sur ACTIF/SUSPENDU/EXPIRE.
                  label: `${l.reference} (${l.status})`,
                }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="file">{t("fileLabel")}</Label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".csv,.json,application/json,text/csv"
                required
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            {error !== "" && <p className="text-destructive text-xs">{error}</p>}
            {info !== "" && <p className="text-success text-xs">{info}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                }}
                disabled={pending}
              >
                {t("close")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? t("importing") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function strReq(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
