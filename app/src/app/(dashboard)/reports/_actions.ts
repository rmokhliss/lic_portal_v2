// ==============================================================================
// LIC v2 — Server Actions /reports (Phase 11.B EC-09 + Phase 16 audit lectures)
// ADMIN/SADMIN only. Cap export 100k lignes (SPX-LIC-755).
//
// Phase 16 — DETTE-LIC-022 résolue : audit best-effort EXPORT_CSV_LICENCES /
// EXPORT_CSV_RENOUVELLEMENTS posé après chaque export réussi (les exports
// audit existants — exportAuditCsv — sont eux-mêmes un audit, on ne les
// re-audite pas).
// ==============================================================================

"use server";

import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import {
  exportAuditCsvUseCase,
  exportLicencesCsvUseCase,
  exportRenouvellementsCsvUseCase,
  recordAuditEntryUseCase,
} from "@/server/composition-root";
import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("reports/actions");

/** Phase 16 — audit best-effort pour les exports CSV (DETTE-LIC-022). */
async function auditExport(
  action: "EXPORT_CSV_LICENCES" | "EXPORT_CSV_RENOUVELLEMENTS",
  actorId: string,
  actorDisplay: string,
  filters: Record<string, unknown>,
): Promise<void> {
  try {
    await recordAuditEntryUseCase.execute({
      entity: "report",
      entityId: actorId, // pas d'entité métier unique — on lie à l'acteur.
      action,
      afterData: filters,
      userId: actorId,
      userDisplay: actorDisplay,
      mode: "MANUEL",
    });
  } catch (err) {
    log.warn(
      {
        event: "audit_export_failed",
        action,
        error: err instanceof Error ? err.message : String(err),
      },
      "Échec audit export CSV best-effort (CSV livré OK)",
    );
  }
}

const ExportLicencesSchema = z
  .object({
    clientId: z.uuid().optional(),
    status: z.enum(["ACTIF", "INACTIF", "SUSPENDU", "EXPIRE"]).optional(),
  })
  .strict();

const ExportRenouvellementsSchema = z
  .object({
    clientId: z.uuid().optional(),
    status: z.enum(["EN_COURS", "VALIDE", "CREE", "ANNULE"]).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .strict();

const ExportAuditSchema = z
  .object({
    action: z.string().max(40).optional(),
    entity: z.string().max(40).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .strict();

export async function exportLicencesCsvAction(input: unknown): Promise<{ csv: string }> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportLicencesSchema.parse(input);
  const csv = await exportLicencesCsvUseCase.execute({
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
  });
  // Phase 16 — audit best-effort EXPORT_CSV_LICENCES.
  await auditExport("EXPORT_CSV_LICENCES", actor.id, actor.display, parsed);
  return { csv };
}

export async function exportRenouvellementsCsvAction(input: unknown): Promise<{ csv: string }> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportRenouvellementsSchema.parse(input);
  const csv = await exportRenouvellementsCsvUseCase.execute({
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.fromDate !== undefined && parsed.fromDate !== ""
      ? { fromDate: new Date(parsed.fromDate) }
      : {}),
    ...(parsed.toDate !== undefined && parsed.toDate !== ""
      ? { toDate: new Date(parsed.toDate) }
      : {}),
  });
  // Phase 16 — audit best-effort EXPORT_CSV_RENOUVELLEMENTS.
  await auditExport("EXPORT_CSV_RENOUVELLEMENTS", actor.id, actor.display, parsed);
  return { csv };
}

export async function exportAuditCsvReportAction(input: unknown): Promise<{ csv: string }> {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportAuditSchema.parse(input);
  const csv = await exportAuditCsvUseCase.execute({
    ...(parsed.action !== undefined ? { action: parsed.action } : {}),
    ...(parsed.entity !== undefined ? { entity: parsed.entity } : {}),
    ...(parsed.fromDate !== undefined && parsed.fromDate !== ""
      ? { fromDate: new Date(parsed.fromDate) }
      : {}),
    ...(parsed.toDate !== undefined && parsed.toDate !== ""
      ? { toDate: new Date(parsed.toDate) }
      : {}),
  });
  return { csv };
}
