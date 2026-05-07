// ==============================================================================
// LIC v2 — ContactDialog (Phase 4 étape 4.F)
// Dialog partagé create/edit pour un contact d'une entité donnée.
// Le typeContactCode est saisi en text libre — la validation FK existante
// (lic_types_contact_ref.code) attrapera les codes inconnus côté serveur
// (le SADMIN administre la liste depuis /settings/team).
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

import { createContactAction, updateContactAction } from "../_actions";
import type { ContactDTO } from "./clients-detail-types";

export interface ContactDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly clientId: string;
  readonly entiteId: string;
  readonly typesContactOptions: readonly string[];
  readonly mode: "create" | "edit";
  readonly contact?: ContactDTO;
}

export function ContactDialog(props: ContactDialogProps) {
  const t = useTranslations("clients.detail.contacts.dialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const typeContactCode = strReq(fd.get("typeContactCode"));
    const nom = strReq(fd.get("nom"));
    const prenom = strOpt(fd.get("prenom"));
    const email = strOpt(fd.get("email"));
    const telephone = strOpt(fd.get("telephone"));

    startTransition(() => {
      void (async () => {
        try {
          if (props.mode === "create") {
            const payload: Record<string, unknown> = {
              entiteId: props.entiteId,
              typeContactCode,
              nom,
            };
            if (prenom !== undefined) payload.prenom = prenom;
            if (email !== undefined) payload.email = email;
            if (telephone !== undefined) payload.telephone = telephone;
            const r = await createContactAction(payload, { clientId: props.clientId });
            if (!r.success) {
              setError(r.error);
              return;
            }
          } else {
            if (!props.contact) {
              setError("Contact manquant");
              return;
            }
            const r = await updateContactAction(
              {
                contactId: props.contact.id,
                typeContactCode,
                nom,
                prenom: prenom ?? "",
                email: email ?? "",
                telephone: telephone ?? "",
              },
              { clientId: props.clientId },
            );
            if (!r.success) {
              setError(r.error);
              return;
            }
          }
          setError("");
          props.onOpenChange(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? t("createTitle") : t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="typeContactCode">{t("typeContactCode")}</Label>
            <select
              id="typeContactCode"
              name="typeContactCode"
              required
              defaultValue={props.mode === "edit" ? (props.contact?.typeContactCode ?? "") : ""}
              className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
            >
              {props.typesContactOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nom">{t("nom")}</Label>
              <Input
                id="nom"
                name="nom"
                required
                maxLength={100}
                defaultValue={props.mode === "edit" ? (props.contact?.nom ?? "") : ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prenom">{t("prenom")}</Label>
              <Input
                id="prenom"
                name="prenom"
                maxLength={100}
                defaultValue={props.mode === "edit" ? (props.contact?.prenom ?? "") : ""}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={200}
              defaultValue={props.mode === "edit" ? (props.contact?.email ?? "") : ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telephone">{t("telephone")}</Label>
            <Input
              id="telephone"
              name="telephone"
              type="tel"
              maxLength={20}
              defaultValue={props.mode === "edit" ? (props.contact?.telephone ?? "") : ""}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                props.onOpenChange(false);
              }}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? props.mode === "create"
                  ? t("creating")
                  : t("saving")
                : props.mode === "create"
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
