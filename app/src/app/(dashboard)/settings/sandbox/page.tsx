// ==============================================================================
// LIC v2 — /settings/sandbox (Phase 3.F)
//
// Outils PKI/crypto pour test/validation. Règle L16 : aucune écriture BD.
// ==============================================================================

import { requireRolePage } from "@/server/infrastructure/auth";

import { SandboxPanel } from "./_components/SandboxPanel";

export default async function SettingsSandboxPage(): Promise<React.JSX.Element> {
  await requireRolePage(["SADMIN"]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-spx-ink text-2xl font-bold">Sandbox PKI</h1>
        <p className="text-spx-ink/70 text-sm">
          Outils de test pour la signature, vérification et chiffrement. Toutes les opérations sont
          en mémoire — aucune donnée persistée.
        </p>
      </header>

      <SandboxPanel />
    </div>
  );
}
