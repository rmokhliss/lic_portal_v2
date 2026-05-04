// ==============================================================================
// LIC v2 — ListAuditByEntityUseCase (Phase 7 étape 7.A)
// Audit direct sur une entité (entity, entityId).
// ==============================================================================

import { toDTO, type AuditPageDTO } from "../adapters/postgres/audit-query.dto";
import type { AuditQueryFilters, AuditQueryRepository } from "../ports/audit-query.repository";

export interface ListAuditByEntityInput {
  readonly entity: string;
  readonly entityId: string;
  readonly filters?: Omit<AuditQueryFilters, "entity">;
}

export class ListAuditByEntityUseCase {
  constructor(private readonly auditQueryRepository: AuditQueryRepository) {}

  async execute(input: ListAuditByEntityInput): Promise<AuditPageDTO> {
    const page = await this.auditQueryRepository.listByEntity(
      input.entity,
      input.entityId,
      input.filters ?? {},
    );
    return {
      items: page.items.map(toDTO),
      nextCursor: page.nextCursor,
    };
  }
}
