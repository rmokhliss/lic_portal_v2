// ==============================================================================
// LIC v2 — ForgotPasswordForm (Client Component, Phase 24)
//
// Form simple email → action serveur → message générique anti-énumération.
// ==============================================================================

"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { forgotPasswordAction } from "../_actions";

export function ForgotPasswordForm(): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(() => {
      void (async () => {
        try {
          const r = await forgotPasswordAction(fd);
          if (!r.ok && r.error !== undefined) {
            setError(r.error);
            return;
          }
          setSubmitted(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  };

  if (submitted) {
    return (
      <div
        role="status"
        className="bg-secondary border-success/40 rounded-md border px-3 py-3 text-sm"
      >
        <p className="text-foreground font-medium">Demande envoyée.</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Si l&apos;adresse email correspond à un compte actif, un mot de passe temporaire vient
          d&apos;être envoyé à cette adresse. Vérifie aussi ton dossier spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="vous@s2m.ma"
          disabled={pending}
        />
      </div>

      {error !== "" && (
        <div
          role="alert"
          className="bg-secondary border-destructive/40 rounded-md border px-3 py-2 text-sm"
        >
          <span className="text-destructive">{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="font-display mt-2 font-extrabold uppercase tracking-wider"
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Envoi…
          </>
        ) : (
          "Réinitialiser le mot de passe"
        )}
      </Button>
    </form>
  );
}
