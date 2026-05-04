// ==============================================================================
// LIC v2 — Job check-alerts (Phase 8.C, schedule quotidien)
//
// Pour chaque AlertConfig actif :
//   - seuil_volume_pct : si une licence-article du client a
//     vol_consomme/vol_autorise >= seuil → notifie tous les ADMIN/SADMIN
//   - seuil_date_jours : si une licence du client a date_fin <= NOW()+jours
//     → notifie tous les ADMIN/SADMIN
//
// Crée une notification IN_APP par destinataire ciblé (Phase 8 = canal IN_APP
// uniquement, EMAIL/SMS = Phase 3 SMTP). `metadata.alertConfigId` sert à
// dédupliquer côté UI (1 seul Drawer item par config / licence / jour).
// ==============================================================================

import { eq, sql } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";
import { alertConfigRepository } from "@/server/modules/alert-config/alert-config.module";
import { createNotificationUseCase } from "@/server/modules/notification/notification.module";
import { users } from "@/server/modules/user/adapters/postgres/schema";

import { track } from "../batch-tracker";

const JOB_CODE = "check-alerts";

interface VolumeThresholdRow extends Record<string, unknown> {
  readonly licence_id: string;
  readonly licence_reference: string;
  readonly article_code: string;
  readonly volume_autorise: number;
  readonly volume_consomme: number;
  readonly pct: number;
}

interface DateThresholdRow extends Record<string, unknown> {
  readonly licence_id: string;
  readonly licence_reference: string;
  readonly date_fin: Date;
  readonly jours_restants: number;
}

export async function runCheckAlerts(declencheur: "SCHEDULED" | "MANUAL" = "SCHEDULED") {
  return track(JOB_CODE, declencheur, async (log) => {
    const configs = await alertConfigRepository.findAllActive();
    await log.info("Starting check-alerts", { activeConfigs: configs.length });

    // Cible des notifications : tous les ADMIN/SADMIN actifs.
    const adminRows = await db.select({ id: users.id }).from(users).where(eq(users.actif, true));
    const adminIds = adminRows.map((r) => r.id);
    if (adminIds.length === 0) {
      await log.warn("No active admin user — notifications skipped");
      return { configs: configs.length, notified: 0 };
    }

    let notifsCreated = 0;

    for (const cfg of configs) {
      // Seuil volume
      if (cfg.seuilVolumePct !== null) {
        const result = await db.execute<VolumeThresholdRow>(sql`
          SELECT
            l.id AS licence_id,
            l.reference AS licence_reference,
            ar.code AS article_code,
            la.volume_autorise,
            la.volume_consomme,
            CASE WHEN la.volume_autorise = 0 THEN 0
                 ELSE ROUND((la.volume_consomme::numeric / la.volume_autorise::numeric) * 100)
            END AS pct
          FROM lic_licence_articles la
          JOIN lic_licences l ON la.licence_id = l.id
          JOIN lic_articles_ref ar ON la.article_id = ar.id
          WHERE l.client_id = ${cfg.clientId}::uuid
            AND la.volume_autorise > 0
            AND (la.volume_consomme::numeric / la.volume_autorise::numeric) * 100 >= ${cfg.seuilVolumePct}
        `);
        const rows = result as unknown as readonly VolumeThresholdRow[];
        for (const row of rows) {
          for (const adminId of adminIds) {
            await createNotificationUseCase.execute({
              userId: adminId,
              title: `Volume ${row.licence_reference} / ${row.article_code} : ${String(row.pct)}%`,
              body: `${String(row.volume_consomme)} / ${String(row.volume_autorise)} consommé — seuil ${String(cfg.seuilVolumePct)}% atteint (config "${cfg.libelle}").`,
              href: `/licences/${row.licence_id}/articles`,
              priority: row.pct >= 100 ? "CRITICAL" : "WARNING",
              source: "VOLUME_THRESHOLD",
              metadata: {
                alertConfigId: cfg.id,
                licenceId: row.licence_id,
                articleCode: row.article_code,
                pct: row.pct,
              },
            });
            notifsCreated++;
          }
        }
      }

      // Seuil date
      if (cfg.seuilDateJours !== null) {
        const result = await db.execute<DateThresholdRow>(sql`
          SELECT
            l.id AS licence_id,
            l.reference AS licence_reference,
            l.date_fin,
            EXTRACT(DAY FROM (l.date_fin - NOW()))::int AS jours_restants
          FROM lic_licences l
          WHERE l.client_id = ${cfg.clientId}::uuid
            AND l.status = 'ACTIF'
            AND l.date_fin > NOW()
            AND l.date_fin <= NOW() + (${cfg.seuilDateJours} || ' days')::interval
        `);
        const rows = result as unknown as readonly DateThresholdRow[];
        for (const row of rows) {
          for (const adminId of adminIds) {
            await createNotificationUseCase.execute({
              userId: adminId,
              title: `Licence ${row.licence_reference} expire dans ${String(row.jours_restants)} jours`,
              body: `Date de fin : ${row.date_fin.toISOString().slice(0, 10)} — config "${cfg.libelle}".`,
              href: `/licences/${row.licence_id}/resume`,
              priority: row.jours_restants <= 7 ? "CRITICAL" : "WARNING",
              source: "DATE_THRESHOLD",
              metadata: {
                alertConfigId: cfg.id,
                licenceId: row.licence_id,
                joursRestants: row.jours_restants,
              },
            });
            notifsCreated++;
          }
        }
      }
    }

    await log.info("check-alerts done", { notifsCreated });
    return { configs: configs.length, notified: notifsCreated };
  });
}
