// ==============================================================================
// LIC v2 — SearchAuditUseCase (Phase 7 étape 7.A)
// Recherche globale — page /audit (EC-06).
// ==============================================================================

import { toDTO, type AuditPageDTO } from "../adapters/postgres/audit-query.dto";
import type { AuditQueryFilters, AuditQueryRepository } from "../ports/audit-query.repository";

export type SearchAuditInput = AuditQueryFilters;

export class SearchAuditUseCase {
  constructor(private readonly auditQueryRepository: AuditQueryRepository) {}

  async execute(input: SearchAuditInput = {}): Promise<AuditPageDTO> {
    const page = await this.auditQueryRepository.search(input);
    return {
      items: page.items.map(toDTO),
      nextCursor: page.nextCursor,
    };
  }
}
