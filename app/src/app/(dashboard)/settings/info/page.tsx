// ==============================================================================
// LIC v2 — /settings/info (Phase 2.B étape 7/7 + Phase 20 R-34 simplifié)
//
// Server Component lecture seule : version app + Build SHA + uptime process.
// Phase 20 R-34 — retiré Runtime Node / Plateforme / Stack (3 lignes peu
// utiles à l'utilisateur final qui veut savoir "quelle version tourne").
// ==============================================================================

import appPackage from "../../../../../package.json" with { type: "json" };

export default function SettingsInfoPage() {
  const buildSha = process.env.BUILD_SHA ?? "dev";
  const uptimeSec = Math.floor(process.uptime());
  const bootedAt = new Date(Date.now() - uptimeSec * 1000);

  const rows: readonly { label: string; value: string }[] = [
    { label: "Application", value: appPackage.name },
    { label: "Version", value: appPackage.version },
    { label: "Build SHA", value: buildSha },
    { label: "Démarré le", value: bootedAt.toISOString() },
    { label: "Uptime", value: formatUptime(uptimeSec) },
  ];

  return (
    <dl className="divide-border divide-y rounded-md border">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-3 gap-4 px-4 py-3">
          <dt className="text-muted-foreground text-sm">{r.label}</dt>
          <dd className="col-span-2 font-mono text-sm">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatUptime(sec: number): string {
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (days > 0) return `${String(days)}j ${String(hours)}h ${String(minutes)}m`;
  if (hours > 0) return `${String(hours)}h ${String(minutes)}m`;
  if (minutes > 0) return `${String(minutes)}m ${String(seconds)}s`;
  return `${String(seconds)}s`;
}
