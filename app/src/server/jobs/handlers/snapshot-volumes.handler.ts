// ==============================================================================
// LIC v2 — Job snapshot-volumes (Phase 8.C, schedule mensuel + Phase 23 nullable)
//
// Pour chaque liaison licence×article actuelle dont l'article est volumétrique
// ET dont les volumes sont définis (non-null), écrit un snapshot dans
// lic_article_volume_history pour la périodicité courante (1er jour du mois).
// Idempotent : conflit (licence, article, periode) UNIQUE → skip.
//
// Phase 23 — filtrage `controle_volume=true AND volume_autorise IS NOT NULL` :
// les articles fonctionnalités (Core, modules) n'ont pas de notion de volume,
// snapshot-er leurs liaisons n'aurait pas de sens (et casserait le use-case
// qui exige des entiers). Les articles volumétriques sans volume défini
// (volume_autorise=NULL = "non encore plafonné") sont également skip jusqu'à
// ce que l'admin renseigne un volume.
// ==============================================================================

import { sql } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";
import { recordVolumeSnapshotUseCase } from "@/server/modules/volume-history/volume-history.module";

import { track } from "../batch-tracker";

const JOB_CODE = "snapshot-volumes";

interface LicenceArticleRow extends Record<string, unknown> {
  readonly licence_id: string;
  readonly article_id: number;
  readonly volume_autorise: number;
  readonly volume_consomme: number;
}

export async function runSnapshotVolumes(declencheur: "SCHEDULED" | "MANUAL" = "SCHEDULED") {
  return track(JOB_CODE, declencheur, async (log) => {
    const now = new Date();
    const periode = new Date(now.getFullYear(), now.getMonth(), 1);

    // Phase 23 — JOIN sur lic_articles_ref pour filtrer controle_volume=true.
    // Les liaisons sans volume défini sont aussi exclues (snapshot inutile).
    const rowsResult = await db.execute<LicenceArticleRow>(sql`
      SELECT la.licence_id, la.article_id, la.volume_autorise, la.volume_consomme
      FROM lic_licence_articles la
      JOIN lic_articles_ref a ON a.id = la.article_id
      WHERE a.controle_volume = true
        AND la.volume_autorise IS NOT NULL
        AND la.volume_consomme IS NOT NULL
    `);
    const rows = rowsResult as unknown as readonly LicenceArticleRow[];

    await log.info("Starting snapshot-volumes", {
      periode: periode.toISOString().slice(0, 10),
      eligibleRows: rows.length,
    });

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        await recordVolumeSnapshotUseCase.execute({
          licenceId: row.licence_id,
          articleId: row.article_id,
          periode,
          volumeAutorise: row.volume_autorise,
          volumeConsomme: row.volume_consomme,
        });
        created++;
      } catch (err) {
        // SPX-LIC-754 = conflit unique périodique (déjà snapshotté ce mois).
        const code = (err as { code?: string }).code;
        if (code === "SPX-LIC-754") {
          skipped++;
        } else {
          errors++;
          await log.error("Snapshot failed for row", {
            licenceId: row.licence_id,
            articleId: row.article_id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    await log.info("snapshot-volumes done", { created, skipped, errors });
    return { created, skipped, errors, total: rows.length };
  });
}
