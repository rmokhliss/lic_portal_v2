// ==============================================================================
// LIC v2 — Server Action /renewals (Phase 9.B)
// Recherche cross-clients ADMIN/SADMIN.
// ==============================================================================

"use server";

import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import { searchRenouvellementsUseCase } from "@/server/composition-root";

const SearchSchema = z
  .object({
    cursor: z.string().max(200).optional(),
    status: z.enum(["EN_COURS", "VALIDE", "CREE", "ANNULE"]).optional(),
    clientId: z.uuid().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .strict();

export async function searchRenouvellementsAction(input: unknown) {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = SearchSchema.parse(input);
  return searchRenouvellementsUseCase.execute({
    ...(parsed.cursor !== undefined ? { cursor: parsed.cursor } : {}),
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.fromDate !== undefined && parsed.fromDate !== ""
      ? { fromDate: new Date(parsed.fromDate) }
      : {}),
    ...(parsed.toDate !== undefined && parsed.toDate !== ""
      ? { toDate: new Date(parsed.toDate) }
      : {}),
    limit: 50,
  });
}
