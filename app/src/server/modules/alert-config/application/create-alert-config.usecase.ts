// ==============================================================================
// LIC v2 — CreateAlertConfigUseCase (Phase 8.B)
// Audit ALERT_CONFIG_CREATED dans même tx (L3).
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type AlertConfigDTO } from "../adapters/postgres/alert-config.mapper";
import {
  AlertConfig,
  type CreateAlertConfigInput as DomainInput,
} from "../domain/alert-config.entity";
import type { AlertConfigRepository } from "../ports/alert-config.repository";

export type CreateAlertConfigInput = DomainInput;

export class CreateAlertConfigUseCase {
  constructor(
    private readonly alertConfigRepository: AlertConfigRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: CreateAlertConfigInput, actorId: string): Promise<AlertConfigDTO> {
    const persisted = await db.transaction(async (tx) => {
      const candidate = AlertConfig.create(input);
      const saved = await this.alertConfigRepository.save(candidate, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "alert-config",
        entityId: saved.id,
        action: "ALERT_CONFIG_CREATED",
        afterData: saved.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return saved;
    });

    return toDTO(persisted);
  }
}
