// ==============================================================================
// LIC v2 — ChangePasswordForm (Client Component, F-09 refactor shadcn)
//
// useTransition pour gérer le pending de la Server Action (vs useFormStatus
// qui ne capte pas les actions invoquées via startTransition). Permet d'afficher
// l'erreur retournée inline sans redirect.
// ==============================================================================

"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { changePasswordAction, type ChangePasswordActionResult } from "../_actions";

export function ChangePasswordForm({
  forced,
}: {
  /** true si l'utilisateur est forcé de changer (mustChangePassword). */
  readonly forced: boolean;
}) {
  const [error, setError] = useState<ChangePasswordActionResult["error"] | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await changePasswordAction({
        currentPassword: stringField(formData, "currentPassword"),
        newPassword: stringField(formData, "newPassword"),
        confirmPassword: stringField(formData, "confirmPassword"),
      });
      // Si on revient ici, c'est forcément ok=false (succès = redirect interne).
      setError(result.error);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      {forced && (
        <div className="bg-warning/10 border-warning/40 text-warning rounded-md border px-3 py-2 font-sans text-sm">
          Vous devez changer votre mot de passe avant de continuer.
        </div>
      )}

      <Field id="currentPassword" label="Mot de passe actuel" autoComplete="current-password" />
      <Field
        id="newPassword"
        label="Nouveau mot de passe (≥ 12 caractères)"
        autoComplete="new-password"
      />
      <Field
        id="confirmPassword"
        label="Confirmer le nouveau mot de passe"
        autoComplete="new-password"
      />

      {error !== null && (
        <div
          role="alert"
          className="bg-secondary border-destructive/40 flex flex-col gap-0.5 rounded-md border px-3 py-2"
        >
          <span className="text-destructive/80 font-mono text-[10px] uppercase tracking-wider">
            {error.code}
          </span>
          <span className="text-destructive font-sans text-sm">{error.message}</span>
        </div>
      )}

      {/* useTransition gère l'état pending — pas <SubmitButton> ici car
          l'action est invoquée via startTransition (pas form action direct). */}
      <Button
        type="submit"
        disabled={isPending}
        className="font-display mt-2 font-extrabold uppercase tracking-wider"
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            Envoi…
          </>
        ) : (
          "Changer le mot de passe"
        )}
      </Button>
    </form>
  );
}

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function Field({ id, label, autoComplete }: { id: string; label: string; autoComplete: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </Label>
      <Input id={id} name={id} type="password" required autoComplete={autoComplete} />
    </div>
  );
}
