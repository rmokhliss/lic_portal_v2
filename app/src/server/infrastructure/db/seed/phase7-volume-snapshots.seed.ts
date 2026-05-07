// ==============================================================================
// LIC v2 — Seed démo Phase 7 — snapshots volumes historiques (Phase 23 R-43)
//
// Insère 3 snapshots × N liaisons licence/article (controle_volume=true) dans
// lic_article_volume_history. Alimente l'écran EC-09 (rapports volumétrie) et
// les graphes de tendance EC-04.
//
// Stratégie minimale : prend les 5 premières licences avec articles dont
// l'article référentiel a `controle_volume=true`. Pour chacune, 3 snapshots
// progressifs (30%, 55%, 80% du volume autorisé) sur 3 dates échelonnées.
//
// Idempotent :
//   1. Early return global si lic_article_volume_history déjà peuplée
//   2. Chaque INSERT a ON CONFLICT (licence_id, article_id, periode) DO NOTHING
//      (cf. uq_volume_history_licence_article_periode dans schema.ts)
//
// ⚠️  DEV / DÉMO UNIQUEMENT — comme phase4-7. Append-only, pas d'audit
// (donnée calculée — cf. ArticleVolumeSnapshot entity, "Pas d'audit").
// ==============================================================================

import type postgres from "postgres";

import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("db/seed/phase7-volume-snapshots");

interface AttachmentRow {
  readonly licence_id: string;
  readonly article_id: number;
  readonly volume_autorise: number;
}

interface PeriodeSeed {
  readonly date: string;
  readonly ratio: number;
}

const PERIODES: readonly PeriodeSeed[] = [
  { date: "2026-03-01", ratio: 0.3 },
  { date: "2026-04-30", ratio: 0.55 },
  { date: "2026-05-06", ratio: 0.8 },
];

const MAX_LICENCES = 5;

export async function seedPhase7VolumeSnapshots(sql: postgres.Sql): Promise<void> {
  log.info("Phase 7 — seed démo snapshots volumes historiques");

  const existing = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM lic_article_volume_history
  `;
  const count = existing[0]?.count ?? 0;
  if (count > 0) {
    log.info({ count }, "lic_article_volume_history déjà peuplée — skip (idempotent)");
    return;
  }

  // 5 premières licences (par ordre uuidv7 = chrono) × leurs articles volumétriques.
  const rows = await sql<AttachmentRow[]>`
    SELECT la.licence_id, la.article_id, la.volume_autorise
    FROM lic_licence_articles la
    JOIN lic_articles_ref ar ON ar.id = la.article_id
    WHERE ar.controle_volume = true
      AND la.licence_id IN (
        SELECT DISTINCT la2.licence_id
        FROM lic_licence_articles la2
        JOIN lic_articles_ref ar2 ON ar2.id = la2.article_id
        WHERE ar2.controle_volume = true
        ORDER BY la2.licence_id
        LIMIT ${MAX_LICENCES}
      )
    ORDER BY la.licence_id, la.article_id
  `;

  if (rows.length === 0) {
    log.warn("Aucune liaison licence×article volumétrique trouvée — skip");
    return;
  }

  let inserted = 0;
  for (const row of rows) {
    for (const p of PERIODES) {
      const consomme = Math.floor(row.volume_autorise * p.ratio);
      await sql`
        INSERT INTO lic_article_volume_history
          (licence_id, article_id, periode, volume_autorise, volume_consomme)
        VALUES
          (${row.licence_id}, ${row.article_id}, ${p.date}::date,
           ${row.volume_autorise}, ${consomme})
        ON CONFLICT (licence_id, article_id, periode) DO NOTHING
      `;
      inserted++;
    }
  }

  log.info({ liaisons: rows.length, snapshots: inserted }, "Phase 7 — snapshots volumes seedés");
}
