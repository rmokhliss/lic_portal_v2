// ==============================================================================
// LIC v2 — Page /profile/change-password (F-07)
//
// Server Component. Utilise requireAuthForChangePassword (variante sans le
// redirect mustChangePassword pour éviter une boucle infinie sur cette page).
// ==============================================================================

import { BrandLockup } from "@/components/brand/BrandLockup";
import { requireAuthForChangePassword } from "@/server/infrastructure/auth";

import { ChangePasswordForm } from "./_components/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await requireAuthForChangePassword();

  return (
    <main className="bg-surface-0 flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <BrandLockup size={48} tone="dark" />

        <div className="bg-surface-1 border-border-subtle flex w-full flex-col gap-6 rounded-lg border p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-xl text-white">Changer le mot de passe</h1>
            <p className="font-sans text-sm text-white/60">{user.display}</p>
          </div>

          <ChangePasswordForm forced={user.mustChangePassword} />
        </div>
      </div>
    </main>
  );
}
