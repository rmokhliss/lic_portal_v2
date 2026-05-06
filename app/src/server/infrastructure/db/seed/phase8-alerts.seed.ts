// ==============================================================================
// LIC v2 — Seed démo Phase 18 R-03 — 3 alertes préconfigurées
//
// ⚠️  DEV / DÉMO UNIQUEMENT — NE PAS LANCER SUR LA BD UTILISÉE PAR LES TESTS
// ⚠️  NE PAS LANCER EN CI (R-29).
//
// Lancé après seedPhase4Clients (qui crée les codes CDM/BIAT/CMI).
// Crée 3 configurations d'alertes pour démontrer l'écran /alerts dès la
// première session démo. Idempotent (clé naturelle métier = (clientId, libelle)).
//
// Pas d'audit (le seed utilise userId SYSTEM_USER_ID, mode='SEED' n'est pas
// applicable car la table audit n'a pas de FK sur alert-config — l'audit est
// un événement séparé géré par les use-cases en Server Action).
// ==============================================================================

import type postgres from "postgres";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("db/seed/phase8-alerts");

interface AlertSeed {
  readonly codeClient: string;
  readonly libelle: string;
  readonly canaux: readonly ("IN_APP" | "EMAIL" | "SMS")[];
  readonly seuilVolumePct: number | null;
  readonly seuilDateJours: number | null;
}

const ALERT_SEEDS: readonly AlertSeed[] = [
  {
    codeClient: "CDM",
    libelle: "Volume critique 80%",
    canaux: ["IN_APP"],
    seuilVolumePct: 80,
    seuilDateJours: null,
  },
  {
    codeClient: "BIAT",
    libelle: "Échéance 30 jours",
    canaux: ["IN_APP", "EMAIL"],
    seuilVolumePct: null,
    seuilDateJours: 30,
  },
  {
    codeClient: "CMI",
    libelle: "Volume 90% + échéance 15j",
    canaux: ["IN_APP"],
    seuilVolumePct: 90,
    seuilDateJours: 15,
  },
];

export async function seedPhase8Alerts(sql: postgres.Sql): Promise<void> {
  log.info("Phase 18 R-03 — seed démo 3 alertes");

  // Résolution clientId par codeClient (les clients sont seedés en Phase 4).
  const codes = ALERT_SEEDS.map((a) => a.codeClient);
  const rows = await sql<readonly { id: string; code_client: string }[]>`
    SELECT id, code_client FROM lic_clients
    WHERE code_client IN ${sql(codes)}
  `;
  const clientByCode = new Map(rows.map((r) => [r.code_client, r.id]));
  if (clientByCode.size === 0) {
    log.warn("Aucun client CDM/BIAT/CMI seedé — seed alertes skip");
    return;
  }

  let inserted = 0;
  for (const seed of ALERT_SEEDS) {
    const clientId = clientByCode.get(seed.codeClient);
    if (clientId === undefined) {
      log.warn({ codeClient: seed.codeClient }, "Client introuvable, skip alerte");
      continue;
    }

    // Idempotence par WHERE NOT EXISTS sur (client_id, libelle) — la table
    // n'a pas de UNIQUE constraint business, donc clause manuelle.
    const result = await sql`
      INSERT INTO lic_alert_configs (
        client_id, libelle, canaux, seuil_volume_pct, seuil_date_jours,
        actif, cree_par, modifie_par
      )
      SELECT
        ${clientId}::uuid,
        ${seed.libelle},
        ${seed.canaux as readonly string[]}::alert_channel_enum[],
        ${seed.seuilVolumePct},
        ${seed.seuilDateJours},
        true,
        ${SYSTEM_USER_ID}::uuid,
        ${SYSTEM_USER_ID}::uuid
      WHERE NOT EXISTS (
        SELECT 1 FROM lic_alert_configs
        WHERE client_id = ${clientId}::uuid AND libelle = ${seed.libelle}
      )
      RETURNING id
    `;
    if (result.length > 0) inserted++;
  }

  log.info({ inserted, total: ALERT_SEEDS.length }, "Phase 18 R-03 seed completed");
}
