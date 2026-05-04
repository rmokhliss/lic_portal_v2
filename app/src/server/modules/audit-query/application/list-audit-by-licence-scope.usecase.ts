// ==============================================================================
// LIC v2 — ListAuditByLicenceScopeUseCase (Phase 7 étape 7.A)
// Audit "tout ce qui touche une licence".
// ==============================================================================

import { toDTO, type AuditPageDTO } from "../adapters/postgres/audit-query.dto";
import type { AuditQueryFilters, AuditQueryRepository } from "../ports/audit-query.repository";

export interface ListAuditByLicenceScopeInput {
  readonly licenceId: string;
  readonly filters?: AuditQueryFilters;
}

export class ListAuditByLicenceScopeUseCase {
  constructor(private readonly auditQueryRepository: AuditQueryRepository) {}

  async execute(input: ListAuditByLicenceScopeInput): Promise<AuditPageDTO> {
    const page = await this.auditQueryRepository.listByLicenceScope(
      input.licenceId,
      input.filters ?? {},
    );
    return {
      items: page.items.map(toDTO),
      nextCursor: page.nextCursor,
    };
  }
}
