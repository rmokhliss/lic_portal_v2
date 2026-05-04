// ==============================================================================
// LIC v2 — Job auto-renew-licences (Phase 9.C, schedule quotidien)
//
// Pour chaque licence :
//   - renouvellement_auto = true
//   - status = 'ACTIF'
//   - date_fin <= NOW() + 30 jours
//   - PAS de renouvellement EN_COURS ou CREE existant
//
// Crée un Renouvellement statut CREE (acteur SYSTEM, mode JOB) avec :
//   - nouvelleDateDebut = ancienne date_fin
//   - nouvelleDateFin = nouvelleDateDebut + 1 an (durée par défaut)
//
// Audit RENOUVELLEMENT_CREATED_BY_JOB (verbe distinct R-36) + notification
// WARNING aux ADMIN/SADMIN actifs (canal IN_APP — Phase 8.D EMAIL différé).
// ==============================================================================

import { eq, sql } from "drizzle-orm";

import { SYSTEM_USER_DISPLAY, SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { db } from "@/server/infrastructure/db/client";
import { auditRepository } from "@/server/modules/audit/audit.module";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import { createNotificationUseCase } from "@/server/modules/notification/notification.module";
import { Renouvellement } from "@/server/modules/renouvellement/domain/renouvellement.entity";
import { renouvellementRepository } from "@/server/modules/renouvellement/renouvellement.module";
import { users } from "@/server/modules/user/adapters/postgres/schema";

import { track } from "../batch-tracker";

const JOB_CODE = "auto-renew-licences";

interface EligibleLicenceRow extends Record<string, unknown> {
  readonly id: string;
  readonly reference: string;
  readonly date_fin: Date;
  readonly client_id: string;
}

const RENEW_WINDOW_DAYS = 30;
const RENEW_DURATION_YEARS = 1;

export async function runAutoRenewLicences(declencheur: "SCHEDULED" | "MANUAL" = "SCHEDULED") {
  return track(JOB_CODE, declencheur, async (log) => {
    // Licences éligibles : auto-renew + ACTIF + date_fin dans 30j sans
    // renouvellement EN_COURS ou CREE existant. NOT EXISTS pour exclure.
    const result = await db.execute<EligibleLicenceRow>(sql`
      SELECT l.id, l.reference, l.date_fin, l.client_id
      FROM lic_licences l
      WHERE l.renouvellement_auto = true
        AND l.status = 'ACTIF'
        AND l.date_fin <= NOW() + INTERVAL '${sql.raw(String(RENEW_WINDOW_DAYS))} days'
        AND l.date_fin > NOW()
        AND NOT EXISTS (
          SELECT 1 FROM lic_renouvellements r
          WHERE r.licence_id = l.id AND r.status IN ('EN_COURS', 'CREE')
        )
    `);
    const rows = result as unknown as readonly EligibleLicenceRow[];

    await log.info("Starting auto-renew-licences", {
      eligibleLicences: rows.length,
      windowDays: RENEW_WINDOW_DAYS,
    });

    if (rows.length === 0) {
      return { eligible: 0, created: 0, notified: 0 };
    }

    // Cible des notifications : ADMIN/SADMIN actifs.
    const adminRows = await db.select({ id: users.id }).from(users).where(eq(users.actif, true));
    const adminIds = adminRows.map((r) => r.id);

    let created = 0;
    let notifsCreated = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // db.execute() ne parse pas systématiquement les TIMESTAMPTZ en Date —
        // wrap pour les cas où on récupère un string ISO.
        const newDebut = row.date_fin instanceof Date ? row.date_fin : new Date(row.date_fin);
        const newFin = new Date(newDebut);
        newFin.setFullYear(newFin.getFullYear() + RENEW_DURATION_YEARS);

        const candidate = Renouvellement.createForJob({
          licenceId: row.id,
          nouvelleDateDebut: newDebut,
          nouvelleDateFin: newFin,
          commentaire: `Renouvellement automatique (job auto-renew, fenêtre ${String(RENEW_WINDOW_DAYS)}j).`,
        });
        const saved = await renouvellementRepository.save(candidate, SYSTEM_USER_ID);

        const entry = AuditEntry.create({
          entity: "renouvellement",
          entityId: saved.id,
          action: "RENOUVELLEMENT_CREATED_BY_JOB",
          afterData: saved.toAuditSnapshot(),
          userId: SYSTEM_USER_ID,
          userDisplay: SYSTEM_USER_DISPLAY,
          mode: "JOB",
        });
        await auditRepository.save(entry);
        created++;

        const dateFinIso = newDebut.toISOString().slice(0, 10);
        for (const adminId of adminIds) {
          await createNotificationUseCase.execute({
            userId: adminId,
            title: `Renouvellement auto proposé — ${row.reference}`,
            body: `La licence ${row.reference} expire le ${dateFinIso} ; un renouvellement statut CREE a été automatiquement créé. À valider manuellement si besoin.`,
            href: `/licences/${row.id}/renouvellements`,
            priority: "WARNING",
            source: "AUTO_RENEW_PROPOSED",
            metadata: {
              licenceId: row.id,
              renouvellementId: saved.id,
              dateFin: dateFinIso,
            },
          });
          notifsCreated++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${row.reference}: ${message}`);
        await log.error("Auto-renew failed for licence", {
          licenceId: row.id,
          reference: row.reference,
          error: message,
        });
      }
    }

    await log.info("auto-renew-licences done", {
      eligible: rows.length,
      created,
      notified: notifsCreated,
      errors: errors.length,
    });

    return { eligible: rows.length, created, notified: notifsCreated, errors: errors.length };
  });
}
