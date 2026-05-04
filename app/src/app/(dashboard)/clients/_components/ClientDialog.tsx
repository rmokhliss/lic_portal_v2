// ==============================================================================
// LIC v2 — ClientDialog (Phase 4 étape 4.E)
//
// Client Component partagé create / edit (pattern UserDialog 2.B.bis).
// useTransition pour bouton désactivé pendant la requête.
//
// Différences mode :
//   - create : champ codeClient visible (saisi ADMIN+, pattern UPPER)
//             + champ siegeNom optionnel (default = raisonSociale)
//   - edit   : codeClient absent (immuable post-création), inclut
//             expectedVersion (optimistic locking — règle L4 SPX-LIC-728)
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

import { createClientAction, updateClientAction } from "../_actions";

import type { ClientDTO } from "./clients-types";

export interface ClientDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: "create" | "edit";
  readonly client?: ClientDTO;
}

export function ClientDialog({ open, onOpenChange, mode, client }: ClientDialogProps) {
  const t = useTranslations("clients.dialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (mode === "create") {
      const payload: Record<string, unknown> = {
        codeClient: strReq(fd.get("codeClient")).toUpperCase(),
        raisonSociale: strReq(fd.get("raisonSociale")),
      };
      const fields = [
        "nomContact",
        "emailContact",
        "telContact",
        "codePays",
        "codeDevise",
        "codeLangue",
        "salesResponsable",
        "accountManager",
        "siegeNom",
      ] as const;
      for (const f of fields) {
        const v = strOpt(fd.get(f));
        if (v !== undefined) payload[f] = v;
      }

      startTransition(() => {
        void (async () => {
          try {
            await createClientAction(payload);
            setError("");
            onOpenChange(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur");
          }
        })();
      });
      return;
    }

    // mode === "edit"
    if (!client) {
      setError("Client manquant en mode édition");
      return;
    }
    const patch: Record<string, unknown> = {
      clientId: client.id,
      expectedVersion: client.version,
    };
    const editableFields = [
      "raisonSociale",
      "nomContact",
      "emailContact",
      "telContact",
      "codePays",
      "codeDevise",
      "codeLangue",
      "salesResponsable",
      "accountManager",
    ] as const;
    for (const f of editableFields) {
      const v = strOpt(fd.get(f));
      const current = client[f];
      if (v === undefined && current === null) continue;
      if (v !== current) patch[f] = v ?? "";
    }

    startTransition(() => {
      void (async () => {
        try {
          await updateClientAction(patch);
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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createTitle") : t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "create" && (
            <div className="space-y-1">
              <Label htmlFor="codeClient">{t("fields.codeClient")}</Label>
              <Input
                id="codeClient"
                name="codeClient"
                required
                placeholder="BAM"
                pattern="^[A-Z0-9_-]+$"
                maxLength={20}
                className="font-mono uppercase"
              />
              <p className="text-muted-foreground text-xs">{t("fields.codeClientHint")}</p>
            </div>
          )}

          <Field
            name="raisonSociale"
            label={t("fields.raisonSociale")}
            required
            defaultValue={mode === "edit" ? client?.raisonSociale : ""}
            maxLength={200}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              name="codePays"
              label={t("fields.codePays")}
              defaultValue={mode === "edit" ? (client?.codePays ?? "") : ""}
              maxLength={2}
              className="font-mono uppercase"
            />
            <Field
              name="codeDevise"
              label={t("fields.codeDevise")}
              defaultValue={mode === "edit" ? (client?.codeDevise ?? "") : ""}
              maxLength={10}
              className="font-mono uppercase"
            />
          </div>

          <Field
            name="codeLangue"
            label={t("fields.codeLangue")}
            defaultValue={mode === "edit" ? (client?.codeLangue ?? "") : "fr"}
            maxLength={5}
            className="font-mono"
          />

          <Field
            name="nomContact"
            label={t("fields.nomContact")}
            defaultValue={mode === "edit" ? (client?.nomContact ?? "") : ""}
            maxLength={100}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              name="emailContact"
              label={t("fields.emailContact")}
              type="email"
              defaultValue={mode === "edit" ? (client?.emailContact ?? "") : ""}
              maxLength={200}
            />
            <Field
              name="telContact"
              label={t("fields.telContact")}
              type="tel"
              defaultValue={mode === "edit" ? (client?.telContact ?? "") : ""}
              maxLength={20}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              name="salesResponsable"
              label={t("fields.salesResponsable")}
              defaultValue={mode === "edit" ? (client?.salesResponsable ?? "") : ""}
              maxLength={100}
            />
            <Field
              name="accountManager"
              label={t("fields.accountManager")}
              defaultValue={mode === "edit" ? (client?.accountManager ?? "") : ""}
              maxLength={100}
            />
          </div>

          {mode === "create" && (
            <Field name="siegeNom" label={t("fields.siegeNom")} maxLength={200} />
          )}

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

function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  maxLength,
  className,
}: {
  readonly name: string;
  readonly label: string;
  readonly type?: string;
  readonly required?: boolean;
  readonly defaultValue?: string;
  readonly maxLength?: number;
  readonly className?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        className={className}
      />
    </div>
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
