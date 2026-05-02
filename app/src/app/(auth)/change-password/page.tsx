// ==============================================================================
// LIC v2 — Page /change-password (déplacé sous (auth)/ en F-12 fix)
//
// Server Component. Utilise requireAuthForChangePassword (variante sans le
// redirect mustChangePassword pour éviter une boucle infinie sur cette page).
//
// Emplacement (auth)/ et non (dashboard)/ : le change-password forcé est un
// flow d'authentification (l'user ne peut accéder à rien d'autre tant qu'il
// n'a pas changé son mdp). Pas de sidebar/header dashboard ici.
// ==============================================================================

import { BrandLockup } from "@/components/brand/BrandLockup";
import { requireAuthForChangePassword } from "@/server/infrastructure/auth";

import { ChangePasswordForm } from "./_components/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await requireAuthForChangePassword();

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <BrandLockup size={48} tone="dark" />

        <div className="bg-card border-border flex w-full flex-col gap-6 rounded-lg border p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-foreground text-xl">Changer le mot de passe</h1>
            <p className="text-muted-foreground font-sans text-sm">{user.display}</p>
          </div>

          <ChangePasswordForm forced={user.mustChangePassword} />
        </div>
      </div>
    </main>
  );
}
