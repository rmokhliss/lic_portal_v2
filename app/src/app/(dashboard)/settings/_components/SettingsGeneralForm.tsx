// ==============================================================================
// LIC v2 — SettingsGeneralForm (Phase 2.B étape 7/7)
//
// Client Component : form contrôlé pour les 9 clés data-model.md §lic_settings.
// Soumission via Server Action passée en prop (action). useTransition pour
// désactiver le bouton pendant la requête + feedback succès/erreur basique.
// ==============================================================================

"use client";

import { useTransition, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SettingsGeneralFormProps {
  readonly initial: {
    seuil_alerte_defaut?: number;
    tolerance_volume_pct?: number;
    tolerance_date_jours?: number;
    warning_volume_pct?: number;
    warning_date_jours?: number;
    licence_file_aes_key?: string;
    healthcheck_aes_key?: string;
    smtp_configured?: boolean;
    app_name?: string;
  };
  readonly action: (input: unknown) => Promise<void>;
}

export function SettingsGeneralForm({ initial, action }: SettingsGeneralFormProps) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<null | "ok" | "error">(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw: Record<string, unknown> = {
      seuil_alerte_defaut: numOrUndef(fd.get("seuil_alerte_defaut")),
      tolerance_volume_pct: numOrUndef(fd.get("tolerance_volume_pct")),
      tolerance_date_jours: numOrUndef(fd.get("tolerance_date_jours")),
      warning_volume_pct: numOrUndef(fd.get("warning_volume_pct")),
      warning_date_jours: numOrUndef(fd.get("warning_date_jours")),
      licence_file_aes_key: strOrUndef(fd.get("licence_file_aes_key")),
      healthcheck_aes_key: strOrUndef(fd.get("healthcheck_aes_key")),
      smtp_configured: fd.get("smtp_configured") === "on",
      app_name: strOrUndef(fd.get("app_name")),
    };
    // Construit un payload sans les undefined (Zod .strict() refuse les
    // propriétés explicitement undefined). On filtre via Object.entries.
    const payload: Record<string, unknown> = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined),
    );
    startTransition(() => {
      void (async () => {
        try {
          await action(payload);
          setStatus("ok");
          setErrorMsg("");
        } catch (err) {
          setStatus("error");
          setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-foreground font-display mb-2 text-base">Seuils & alertes</legend>
        <NumField
          name="seuil_alerte_defaut"
          label="Seuil alerte par défaut (%)"
          defaultValue={initial.seuil_alerte_defaut}
        />
        <NumField
          name="warning_volume_pct"
          label="Warning volume (%)"
          defaultValue={initial.warning_volume_pct}
        />
        <NumField
          name="warning_date_jours"
          label="Warning expiration (jours)"
          defaultValue={initial.warning_date_jours}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-foreground font-display mb-2 text-base">
          Tolérances healthcheck (règle L15)
        </legend>
        <NumField
          name="tolerance_volume_pct"
          label="Tolérance volume (%)"
          defaultValue={initial.tolerance_volume_pct}
        />
        <NumField
          name="tolerance_date_jours"
          label="Tolérance date (jours)"
          defaultValue={initial.tolerance_date_jours}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-foreground font-display mb-2 text-base">Crypto (Phase 3)</legend>
        <TextField
          name="licence_file_aes_key"
          label="Clé AES fichiers .lic"
          defaultValue={initial.licence_file_aes_key ?? ""}
        />
        <TextField
          name="healthcheck_aes_key"
          label="Clé AES healthcheck"
          defaultValue={initial.healthcheck_aes_key ?? ""}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-foreground font-display mb-2 text-base">Application</legend>
        <TextField
          name="app_name"
          label="Nom de l'application"
          defaultValue={initial.app_name ?? ""}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="smtp_configured"
            name="smtp_configured"
            defaultChecked={initial.smtp_configured ?? false}
            className="size-4"
          />
          <Label htmlFor="smtp_configured">SMTP configuré</Label>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {status === "ok" && <span className="text-sm text-green-700">Paramètres enregistrés.</span>}
        {status === "error" && <span className="text-destructive text-sm">{errorMsg}</span>}
      </div>
    </form>
  );
}

function numOrUndef(v: FormDataEntryValue | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function strOrUndef(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.length === 0 ? undefined : v;
}

function NumField({
  name,
  label,
  defaultValue,
}: {
  readonly name: string;
  readonly label: string;
  readonly defaultValue: number | undefined;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" defaultValue={defaultValue ?? ""} />
    </div>
  );
}

function TextField({
  name,
  label,
  defaultValue,
}: {
  readonly name: string;
  readonly label: string;
  readonly defaultValue: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="text" defaultValue={defaultValue} />
    </div>
  );
}
