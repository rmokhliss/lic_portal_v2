// ==============================================================================
// LIC v2 — Server Actions /audit (Phase 7.C)
//
// Garde ADMIN/SADMIN. Filtres période + action + acteur + entité.
// Export CSV via use-case dédié — refusé si > 50000 lignes (SPX-LIC-755).
// ==============================================================================

"use server";

import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import { exportAuditCsvUseCase, searchAuditUseCase } from "@/server/composition-root";

const SearchAuditQuerySchema = z
  .object({
    cursor: z.string().max(200).optional(),
    action: z.string().max(40).optional(),
    acteur: z.string().max(200).optional(),
    entity: z.string().max(40).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .strict();

function toFilters(parsed: z.infer<typeof SearchAuditQuerySchema>) {
  return {
    ...(parsed.cursor !== undefined ? { cursor: parsed.cursor } : {}),
    ...(parsed.action !== undefined ? { action: parsed.action } : {}),
    ...(parsed.acteur !== undefined ? { userDisplayLike: parsed.acteur } : {}),
    ...(parsed.entity !== undefined ? { entity: parsed.entity } : {}),
    ...(parsed.fromDate !== undefined && parsed.fromDate !== ""
      ? { fromDate: new Date(parsed.fromDate) }
      : {}),
    ...(parsed.toDate !== undefined && parsed.toDate !== ""
      ? { toDate: new Date(parsed.toDate) }
      : {}),
    limit: 50,
  };
}

export async function searchAuditAction(input: unknown) {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = SearchAuditQuerySchema.parse(input);
  return searchAuditUseCase.execute(toFilters(parsed));
}

export async function exportAuditCsvAction(input: unknown): Promise<{ csv: string }> {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = SearchAuditQuerySchema.parse(input);
  // Export ignore le cursor (export complet pour les filtres demandés).
  const filters = toFilters(parsed);
  const { cursor: _cursor, limit: _limit, ...exportFilters } = filters;
  void _cursor;
  void _limit;
  const csv = await exportAuditCsvUseCase.execute(exportFilters);
  return { csv };
}
