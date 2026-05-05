// ==============================================================================
// LIC v2 — /settings/smtp (Phase 14 — DETTE-003 résolue)
//
// Lecture seule de la config SMTP (env vars). Bouton "Tester l'envoi"
// (SADMIN) → email à l'utilisateur connecté via testEmailAction.
// ==============================================================================

import { requireAuthPage } from "@/server/infrastructure/auth";
import { getEmailStatus } from "@/server/composition-root";

import { SmtpPanel } from "./_components/SmtpPanel";

export default async function SettingsSmtpPage() {
  const user = await requireAuthPage();
  const status = getEmailStatus();
  const canTest = user.role === "SADMIN";

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="font-display text-foreground text-2xl">Configuration SMTP</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configuration en lecture seule (variables d&apos;environnement). Pour modifier, éditer
          <code className="bg-muted mx-1 rounded px-1 text-xs">.env</code> + redéployer.
        </p>
      </header>
      <SmtpPanel status={status} canTest={canTest} />
    </div>
  );
}
