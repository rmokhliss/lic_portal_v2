// ==============================================================================
// LIC v2 — Compteurs live des données démo (Phase 17 F2)
//
// COUNT(*) des tables métier principales pour le panneau /settings/demo.
// Lecture seule, pas d'audit (vue purement informative).
// ==============================================================================

import "server-only";

import { sql as rawSql } from "@/server/infrastructure/db/client";

export interface DemoStats {
  readonly clients: number;
  readonly licences: number;
  readonly notifications: number;
  readonly renouvellements: number;
  readonly fichiers: number;
  readonly volumeSnapshots: number;
}

export async function getDemoStats(): Promise<DemoStats> {
  const rows = await rawSql<readonly { tbl: string; n: string }[]>`
    SELECT 'clients'         AS tbl, COUNT(*)::text AS n FROM lic_clients
    UNION ALL SELECT 'licences',         COUNT(*)::text FROM lic_licences
    UNION ALL SELECT 'notifications',    COUNT(*)::text FROM lic_notifications
    UNION ALL SELECT 'renouvellements',  COUNT(*)::text FROM lic_renouvellements
    UNION ALL SELECT 'fichiers',         COUNT(*)::text FROM lic_fichiers_log
    UNION ALL SELECT 'volumeSnapshots',  COUNT(*)::text FROM lic_volume_history
  `;
  const map = new Map<string, number>(rows.map((r) => [r.tbl, Number(r.n)]));
  return {
    clients: map.get("clients") ?? 0,
    licences: map.get("licences") ?? 0,
    notifications: map.get("notifications") ?? 0,
    renouvellements: map.get("renouvellements") ?? 0,
    fichiers: map.get("fichiers") ?? 0,
    volumeSnapshots: map.get("volumeSnapshots") ?? 0,
  };
}
