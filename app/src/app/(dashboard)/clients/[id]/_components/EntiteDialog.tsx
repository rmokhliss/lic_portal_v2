// ==============================================================================
// LIC v2 — EntiteDialog (Phase 4 étape 4.F)
// Dialog partagé create/edit pour une entité d'un client donné.
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

import { createEntiteAction, updateEntiteAction } from "../_actions";
import type { EntiteDTO } from "./clients-detail-types";

export interface EntiteDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly clientId: string;
  readonly mode: "create" | "edit";
  readonly entite?: EntiteDTO;
}

export function EntiteDialog({ open, onOpenChange, clientId, mode, entite }: EntiteDialogProps) {
  const t = useTranslations("clients.detail.entites.dialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nom = strReq(fd.get("nom"));
    const codePays = strOpt(fd.get("codePays"));

    startTransition(() => {
      void (async () => {
        try {
          if (mode === "create") {
            const payload: Record<string, unknown> = { clientId, nom };
            if (codePays !== undefined) payload.codePays = codePays;
            const r = await createEntiteAction(payload);
            if (!r.success) {
              setError(r.error);
              return;
            }
          } else {
            if (!entite) {
              setError("Entité manquante");
              return;
            }
            const patch: Record<string, unknown> = { entiteId: entite.id };
            if (nom !== entite.nom) patch.nom = nom;
            if (codePays !== (entite.codePays ?? undefined)) patch.codePays = codePays;
            const r = await updateEntiteAction(patch, { clientId });
            if (!r.success) {
              setError(r.error);
              return;
            }
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
          <DialogTitle>{mode === "create" ? t("createTitle") : t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nom">{t("nom")}</Label>
            <Input
              id="nom"
              name="nom"
              required
              maxLength={200}
              defaultValue={mode === "edit" ? (entite?.nom ?? "") : ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="codePays">{t("codePays")}</Label>
            <Input
              id="codePays"
              name="codePays"
              maxLength={2}
              defaultValue={mode === "edit" ? (entite?.codePays ?? "") : ""}
              className="font-mono uppercase"
            />
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
              {pending
                ? mode === "create"
                  ? t("creating")
                  : t("saving")
                : mode === "create"
                  ? t("submitCreate")
                  : t("submitEdit")}
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
