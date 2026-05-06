// ==============================================================================
// LIC v2 — /settings/demo (Phase 17 F2)
//
// Outils SADMIN : purge + reload des données démo. Compteurs live affichés
// au-dessus des boutons. Server Component SADMIN-only ; le panneau de
// confirmation (Dialog) est en Client Component (DemoToolsPanel).
// ==============================================================================

import { requireRolePage } from "@/server/infrastructure/auth";
import { getDemoStats } from "@/server/infrastructure/demo/get-demo-stats";

import { DemoToolsPanel } from "./_components/DemoToolsPanel";

export default async function SettingsDemoPage(): Promise<React.JSX.Element> {
  await requireRolePage(["SADMIN"]);
  const stats = await getDemoStats();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-foreground font-display text-lg">Outils démo</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Purge et rechargement des données fictives. Réservé SADMIN.{" "}
          <strong className="text-amber-400">À ne pas utiliser en production.</strong>
        </p>
      </header>

      <section className="border-border bg-surface-1 rounded-lg border p-4">
        <h3 className="text-foreground text-sm font-semibold">État courant</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Clients" value={stats.clients} />
          <Stat label="Licences" value={stats.licences} />
          <Stat label="Notifications" value={stats.notifications} />
          <Stat label="Renouvellements" value={stats.renouvellements} />
          <Stat label="Fichiers .lic" value={stats.fichiers} />
          <Stat label="Snapshots vol." value={stats.volumeSnapshots} />
        </dl>
      </section>

      <DemoToolsPanel />
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-xs uppercase tracking-wider">{label}</dt>
      <dd className="text-foreground font-mono text-2xl">{value.toLocaleString("fr-FR")}</dd>
    </div>
  );
}
