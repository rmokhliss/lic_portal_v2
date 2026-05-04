// ==============================================================================
// LIC v2 — Server Actions /reports (Phase 11.B EC-09)
// ADMIN/SADMIN only. Cap export 100k lignes (SPX-LIC-755).
// ==============================================================================

"use server";

import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import {
  exportAuditCsvUseCase,
  exportLicencesCsvUseCase,
  exportRenouvellementsCsvUseCase,
} from "@/server/composition-root";

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
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportLicencesSchema.parse(input);
  const csv = await exportLicencesCsvUseCase.execute({
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
  });
  return { csv };
}

export async function exportRenouvellementsCsvAction(input: unknown): Promise<{ csv: string }> {
  await requireRole(["ADMIN", "SADMIN"]);
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
