// ==============================================================================
// LIC v2 — Seed démo Phase 18 R-22 — 2 fichiers démo (.lic + .hc)
//
// ⚠️  DEV / DÉMO UNIQUEMENT — NE PAS LANCER SUR LA BD UTILISÉE PAR LES TESTS
// ⚠️  NE PAS LANCER EN CI (R-29).
//
// Lancé après seedPhase5Licences (besoin de licences pour FK). Crée 2
// entrées dans lic_fichiers_log pour peupler /files dès la première session :
//   - 1 LIC_GENERATED pour CDM (statut GENERATED, hash factice)
//   - 1 HEALTHCHECK_IMPORTED pour BIAT (statut IMPORTED, hash factice)
//
// Append-only (DEC-019 — la table EST la trace, pas un événement métier).
// Pas d'audit. Idempotent par tag DEMO_SEED en metadata.
// ==============================================================================

import { createHash } from "node:crypto";

import type postgres from "postgres";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("db/seed/phase10-fichiers");

interface FichierSeed {
  readonly codeClient: string;
  readonly type: "LIC_GENERATED" | "HEALTHCHECK_IMPORTED";
  readonly statut: "GENERATED" | "IMPORTED" | "ERREUR";
  readonly pathTpl: string;
  readonly metadata: Record<string, unknown>;
}

const FICHIER_SEEDS: readonly FichierSeed[] = [
  {
    codeClient: "CDM",
    type: "LIC_GENERATED",
    statut: "GENERATED",
    pathTpl: "lic/CDM-2026-001.lic",
    metadata: { articles: 3, signatureAlgo: "ES256", tag: "DEMO_SEED" },
  },
  {
    codeClient: "BIAT",
    type: "HEALTHCHECK_IMPORTED",
    statut: "IMPORTED",
    pathTpl: "healthcheck/BIAT-2026-04-01.hc",
    metadata: { articlesUpdated: 2, errors: 0, tag: "DEMO_SEED" },
  },
];

const DEMO_TAG = "DEMO_SEED";

async function alreadySeeded(sql: postgres.Sql): Promise<boolean> {
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM lic_fichiers_log
    WHERE metadata->>'tag' = ${DEMO_TAG}
  `;
  return Number(rows[0]?.count ?? "0") > 0;
}

export async function seedPhase10Fichiers(sql: postgres.Sql): Promise<void> {
  log.info("Phase 18 R-22 — seed démo 2 fichiers (.lic + .hc)");

  if (await alreadySeeded(sql)) {
    log.info("Fichiers démo déjà seedés — skip (idempotent)");
    return;
  }

  // Résolution licenceId via la 1ère licence du client. Une licence par
  // client en Phase 5 → la jointure simple suffit.
  const codes = FICHIER_SEEDS.map((f) => f.codeClient);
  const rows = await sql<readonly { licence_id: string; code_client: string }[]>`
    SELECT l.id AS licence_id, c.code_client
    FROM lic_licences l
    JOIN lic_clients c ON c.id = l.client_id
    WHERE c.code_client IN ${sql(codes)}
  `;
  const licenceByCode = new Map(rows.map((r) => [r.code_client, r.licence_id]));
  if (licenceByCode.size === 0) {
    log.warn("Aucune licence CDM/BIAT seedée — seed fichiers skip");
    return;
  }

  let inserted = 0;
  for (const seed of FICHIER_SEEDS) {
    const licenceId = licenceByCode.get(seed.codeClient);
    if (licenceId === undefined) {
      log.warn({ codeClient: seed.codeClient }, "Licence introuvable, skip fichier");
      continue;
    }

    // Hash SHA256 factice mais déterministe (basé sur le path) — permet la
    // ré-exécution idempotente avec les mêmes valeurs.
    const hash = createHash("sha256").update(seed.pathTpl).digest("hex");

    await sql`
      INSERT INTO lic_fichiers_log (
        licence_id, type, statut, path, hash, metadata, cree_par
      ) VALUES (
        ${licenceId}::uuid,
        ${seed.type}::fichier_type_enum,
        ${seed.statut}::fichier_statut_enum,
        ${seed.pathTpl},
        ${hash},
        ${JSON.stringify(seed.metadata)}::jsonb,
        ${SYSTEM_USER_ID}::uuid
      )
    `;
    inserted++;
  }

  log.info({ inserted }, "Phase 18 R-22 seed completed");
}
