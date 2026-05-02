// ==============================================================================
// LIC v2 — ChangePasswordForm (Client Component, F-07)
//
// Form contrôlé minimal (Tailwind brut, refactor F-09 avec shadcn). Affiche
// l'erreur retournée par changePasswordAction. useFormStatus pour bouton
// disabled pendant la soumission.
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

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
          className="bg-surface-2 border-danger/40 flex flex-col gap-0.5 rounded-md border px-3 py-2"
        >
          <span className="text-danger/80 font-mono text-[10px] uppercase tracking-wider">
            {error.code}
          </span>
          <span className="text-danger font-sans text-sm">{error.message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-spx-cyan-500 hover:bg-spx-cyan-100 active:bg-spx-cyan-100 text-surface-0 font-display mt-2 rounded-md py-2.5 text-sm font-extrabold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Envoi…" : "Changer le mot de passe"}
      </button>
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
      <label htmlFor={id} className="font-sans text-xs uppercase tracking-wider text-white/70">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        required
        autoComplete={autoComplete}
        className="bg-surface-2 border-border-subtle focus:border-spx-cyan-500 focus:ring-spx-cyan-500 rounded-md border px-3 py-2 font-sans text-sm text-white placeholder-white/50 focus:outline-none focus:ring-1"
      />
    </div>
  );
}
