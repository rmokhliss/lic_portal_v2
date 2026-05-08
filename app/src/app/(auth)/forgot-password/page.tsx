// ==============================================================================
// LIC v2 — Page /forgot-password (Phase 24 — self-service reset password)
//
// Page publique non authentifiée. Form email → forgotPasswordAction → message
// générique anti-énumération quel que soit le résultat.
// ==============================================================================

import Link from "next/link";

import { BrandLockup } from "@/components/brand/BrandLockup";

import { ForgotPasswordForm } from "./_components/ForgotPasswordForm";

export default function ForgotPasswordPage(): React.JSX.Element {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <BrandLockup size={48} />

        <div className="bg-card border-border flex w-full flex-col gap-6 rounded-lg border p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-foreground text-xl">Mot de passe oublié</h1>
            <p className="text-muted-foreground font-sans text-sm">
              Entre l&apos;adresse email de ton compte. Si elle est connue, un mot de passe
              temporaire te sera envoyé. Tu devras le changer à la première connexion.
            </p>
          </div>

          <ForgotPasswordForm />

          <p className="text-muted-foreground border-border border-t pt-4 text-center text-xs">
            <Link
              href="/login"
              className="hover:text-foreground underline-offset-2 hover:underline"
            >
              ← Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
