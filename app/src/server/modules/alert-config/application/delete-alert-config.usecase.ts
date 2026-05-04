// ==============================================================================
// LIC v2 — DeleteAlertConfigUseCase (Phase 8.B)
// Audit ALERT_CONFIG_DELETED.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { alertConfigNotFoundById } from "../domain/alert-config.errors";
import type { AlertConfigRepository } from "../ports/alert-config.repository";

export interface DeleteAlertConfigInput {
  readonly id: string;
}

export class DeleteAlertConfigUseCase {
  constructor(
    private readonly alertConfigRepository: AlertConfigRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: DeleteAlertConfigInput, actorId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const existing = await this.alertConfigRepository.findById(input.id, tx);
      if (existing === null) throw alertConfigNotFoundById(input.id);

      await this.alertConfigRepository.delete(input.id, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "alert-config",
        entityId: existing.id,
        action: "ALERT_CONFIG_DELETED",
        beforeData: existing.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);
    });
  }
}
