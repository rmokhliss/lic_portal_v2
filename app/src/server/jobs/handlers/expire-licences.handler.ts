// ==============================================================================
// LIC v2 — Job expire-licences (Phase 8.C, schedule quotidien)
//
// UPDATE direct des licences ACTIF dont date_fin < NOW() vers status='EXPIRE'.
//
// Bypass uniquement le use-case `ChangeLicenceStatusUseCase` (qui exige
// `expectedVersion` L4 + actorId interactif — incompatible avec un job non-
// interactif batch). L'audit reste **obligatoire** (règle L3) avec :
//   - userId = SYSTEM_USER_ID
//   - userDisplay = SYSTEM_USER_DISPLAY ("Système (SYS-000)")
//   - action = 'LICENCE_EXPIRED_BY_JOB'  (verbe distinct des transitions
//     manuelles 'LICENCE_EXPIRED' pour traçabilité différenciée)
//   - mode = 'JOB'
//
// Une row d'audit par licence expirée. Pour le throttle (volume), la garde
// haute reste batch_executions.stats.expired qui agrège le run.
// ==============================================================================

import { sql } from "drizzle-orm";

import { SYSTEM_USER_DISPLAY, SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { db } from "@/server/infrastructure/db/client";
import { auditRepository } from "@/server/modules/audit/audit.module";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";

import { track } from "../batch-tracker";

const JOB_CODE = "expire-licences";

interface ExpiredRow extends Record<string, unknown> {
  readonly id: string;
  readonly reference: string;
  readonly date_fin: Date;
  readonly client_id: string;
}

export async function runExpireLicences(declencheur: "SCHEDULED" | "MANUAL" = "SCHEDULED") {
  return track(JOB_CODE, declencheur, async (log) => {
    // UPDATE + RETURNING pour obtenir les licences modifiées, puis 1 audit
    // par licence. Tx implicite postgres-js sur l'UPDATE — chaque INSERT
    // audit est ensuite atomique sur la connexion partagée.
    const result = await db.execute<ExpiredRow>(sql`
      UPDATE lic_licences
      SET status = 'EXPIRE', updated_at = NOW(), version = version + 1
      WHERE status = 'ACTIF' AND date_fin < NOW()
      RETURNING id, reference, date_fin, client_id
    `);
    const rows = result as unknown as readonly ExpiredRow[];

    for (const row of rows) {
      const entry = AuditEntry.create({
        entity: "licence",
        entityId: row.id,
        action: "LICENCE_EXPIRED_BY_JOB",
        afterData: {
          status: "EXPIRE",
          reference: row.reference,
          dateFin: row.date_fin instanceof Date ? row.date_fin.toISOString() : String(row.date_fin),
          clientId: row.client_id,
        },
        userId: SYSTEM_USER_ID,
        userDisplay: SYSTEM_USER_DISPLAY,
        mode: "JOB",
      });
      await auditRepository.save(entry);
    }

    await log.info("expire-licences done", {
      expired: rows.length,
      references: rows.map((r) => r.reference),
    });

    return { expired: rows.length };
  });
}
