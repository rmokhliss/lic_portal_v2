// ==============================================================================
// LIC v2 — ListAuditByClientScopeUseCase (Phase 7 étape 7.A)
// Audit "tout ce qui touche un client" — voir port pour le périmètre.
// ==============================================================================

import { toDTO, type AuditPageDTO } from "../adapters/postgres/audit-query.dto";
import type { AuditQueryFilters, AuditQueryRepository } from "../ports/audit-query.repository";

export interface ListAuditByClientScopeInput {
  readonly clientId: string;
  readonly filters?: AuditQueryFilters;
}

export class ListAuditByClientScopeUseCase {
  constructor(private readonly auditQueryRepository: AuditQueryRepository) {}

  async execute(input: ListAuditByClientScopeInput): Promise<AuditPageDTO> {
    const page = await this.auditQueryRepository.listByClientScope(
      input.clientId,
      input.filters ?? {},
    );
    return {
      items: page.items.map(toDTO),
      nextCursor: page.nextCursor,
    };
  }
}
