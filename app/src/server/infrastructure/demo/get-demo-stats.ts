// ==============================================================================
// LIC v2 — Compteurs live des données démo (Phase 17 F2 + Phase 18 R-01)
//
// COUNT(*) des tables métier principales pour le panneau /settings/demo.
// Lecture seule, pas d'audit (vue purement informative). Phase 18 R-01 :
// chaque compteur isolé en try/catch — une table absente (BD pas encore
// migrée) ne fait plus crasher la page.
// ==============================================================================

import "server-only";

import { sql as rawSql } from "@/server/infrastructure/db/client";
import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("infrastructure/demo/get-demo-stats");

export interface DemoStats {
  readonly clients: number;
  readonly licences: number;
  readonly notifications: number;
  readonly renouvellements: number;
  readonly fichiers: number;
  readonly volumeSnapshots: number;
}

async function safeCount(table: string): Promise<number> {
  try {
    const rows = await rawSql<readonly { n: string }[]>`
      SELECT COUNT(*)::text AS n FROM ${rawSql(table)}
    `;
    return Number(rows[0]?.n ?? "0");
  } catch (err) {
    // Table absente (BD non migrée) ou autre erreur SQL : compteur à 0,
    // pas de crash 500 sur /settings/demo (R-01).
    log.warn(
      { event: "count_failed", table, error: err instanceof Error ? err.message : String(err) },
      "Compteur démo : table absente ou requête refusée — fallback 0",
    );
    return 0;
  }
}

export async function getDemoStats(): Promise<DemoStats> {
  const [clients, licences, notifications, renouvellements, fichiers, volumeSnapshots] =
    await Promise.all([
      safeCount("lic_clients"),
      safeCount("lic_licences"),
      safeCount("lic_notifications"),
      safeCount("lic_renouvellements"),
      safeCount("lic_fichiers_log"),
      safeCount("lic_article_volume_history"),
    ]);
  return { clients, licences, notifications, renouvellements, fichiers, volumeSnapshots };
}
