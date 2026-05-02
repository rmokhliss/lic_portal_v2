// ==============================================================================
// LIC v2 — SearchAuditLogUseCase (F-08)
//
// Recherche FTS + filtres + pagination cursor. Cap silencieux limit ≤ 200
// (Référentiel §4.15). Retourne `effectiveLimit` pour informer le caller.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";
import type {
  AuditPage,
  AuditRepository,
  SearchAuditFilters,
} from "@/server/modules/audit/ports/audit.repository";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export type SearchAuditLogInput = SearchAuditFilters;
export type SearchAuditLogOutput = AuditPage;

export class SearchAuditLogUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  /** Throw ValidationError SPX-LIC-500 si fromDate > toDate.
   *  Throw ValidationError SPX-LIC-502 si cursor invalide (via decodeCursor). */
  async execute(filters: SearchAuditLogInput): Promise<SearchAuditLogOutput> {
    if (
      filters.fromDate !== undefined &&
      filters.toDate !== undefined &&
      filters.fromDate.getTime() > filters.toDate.getTime()
    ) {
      throw new ValidationError({
        code: "SPX-LIC-500",
        message: "fromDate doit être antérieur ou égal à toDate",
      });
    }

    // Cap silencieux (default 50, max 200). Le repo reçoit la limit effective
    // et la propage dans AuditPage.effectiveLimit.
    const requested = filters.limit ?? DEFAULT_LIMIT;
    const effectiveLimit = Math.min(Math.max(1, requested), MAX_LIMIT);

    return this.auditRepository.search({ ...filters, limit: effectiveLimit });
  }
}
